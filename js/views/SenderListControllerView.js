'use strict';

const
	_ = require('underscore'),
	ko = require('knockout'),

	TextUtils = require('%PathToCoreWebclientModule%/js/utils/Text.js'),
	Types = require('%PathToCoreWebclientModule%/js/utils/Types.js'),

	Ajax = require('%PathToCoreWebclientModule%/js/Ajax.js'),
	App = require('%PathToCoreWebclientModule%/js/App.js'),
	ModulesManager = require('%PathToCoreWebclientModule%/js/ModulesManager.js'),
	Storage = require('%PathToCoreWebclientModule%/js/Storage.js'),

	MailCache = ModulesManager.run('MailWebclient', 'getMailCache'),
	MailSettings = require('modules/MailWebclient/js/Settings.js'),

	Settings = require('modules/%ModuleName%/js/Settings.js')
;

function getCurrentSearchSender (senders)
{
	if (!MailCache || !MailCache.uidList()) {
		return null;
	}

	const
		uidList = MailCache.uidList(),
		inboxFolderFullName = MailCache.folderList().inboxFolderFullName(),
		search = uidList.search() || ''
	;
	if (
		search !== '' &&
		uidList.sFullName === inboxFolderFullName &&
		uidList.filters() === '' &&
		uidList.sortBy() === MailSettings.MessagesSortBy.DefaultSortBy &&
		uidList.sortOrder() === MailSettings.MessagesSortBy.DefaultSortOrder
	) {
		return senders.find(sender => {
			return search === `from:${sender.email} folders:all`;
		}) || null;
	}
	return null;
}

function getSearchPeriod ()
{
	if (Settings.SearchPeriod === 'all') {
		return '';
	}
	return Settings.SearchPeriod;
}

function getSearchFolders ()
{
	const inboxFolder = MailCache.folderList().inboxFolder();
	if (!inboxFolder) {
		return [];
	}
	switch (Settings.SearchFolders) {
		case 'inbox':
			return [inboxFolder.fullName()];
		case 'inbox+subfolders':
			const subfolders = inboxFolder.subfolders().map(folder => folder.fullName());
			return [inboxFolder.fullName()].concat(subfolders);
		default:
			return [];
	}
}

function CSenderListControllerView()
{
	this.senders = ko.observableArray([]);
	this.sendersExpanded = ko.observable(!!Storage.getData('sendersExpanded'));
	this.isLoading = ko.observable(false);

	this.syncedAccounts = [];

	this.hideLastSenders = ko.computed(() => {
		return Settings.NumberOfSendersToDisplay > 0
			   && Settings.NumberOfSendersToDisplay < (this.senders().length - 1);
	});
	this.firstSenders = ko.computed(() => {
		if (this.hideLastSenders()) {
			return this.senders().slice(0, Settings.NumberOfSendersToDisplay);
		} else {
			return this.senders();
		}
	});
	this.lastSenders = ko.computed(() => {
		if (this.hideLastSenders()) {
			return this.senders().slice(Settings.NumberOfSendersToDisplay);
		} else {
			return [];
		}
	});
	this.showLastSenders = ko.observable(false);
	this.lastSendersMaxHeight = ko.observable(0);
	this.lastSendersDom = ko.observable(null);
	this.senderListDivided = ko.computed(() => {
		return this.lastSenders().length > 0;
	});

	if (MailCache) {
		this.selectedSender = null;
		ko.computed(() => {
			const sender = getCurrentSearchSender(this.senders());
			if (this.selectedSender) {
				this.selectedSender.selected(false);
				this.selectedSender = null;
			}
			if (sender) {
				const inboxFolder = MailCache.folderList().inboxFolder();
				inboxFolder.selected(false);
				sender.selected(true);
				this.selectedSender = sender;
				this.sendersExpanded(true);
				if (this.lastSenders().find(lastSender => lastSender.email === sender.email)) {
					this.setLastSendersMaxHeight();
					this.showLastSenders(true);
				}
				if (this.messageListView && this.messageListView.bAdvancedSearch()) {
					this.messageListView.bAdvancedSearch(false);
				}
				$('.MailLayout .search_block .control').hide();
			} else {
				$('.MailLayout .search_block .control').show();
			}
		});
		MailCache.currentAccountId.subscribe(() => {
			this.populateSenders();
		});
	}

	App.subscribeEvent('MailWebclient::ConstructView::after', params => {
		if ('CMessageListView' === params.Name) {
			this.messageListView = params.View;
		}
	});
}

CSenderListControllerView.prototype.ViewTemplate = '%ModuleName%_SenderListControllerView';

CSenderListControllerView.prototype.triggerSendersExpanded = function ()
{
	this.sendersExpanded(!this.sendersExpanded());
	Storage.setData('sendersExpanded', this.sendersExpanded());
};

CSenderListControllerView.prototype.triggerShowLastSenders = function ()
{
	this.setLastSendersMaxHeight();
	this.showLastSenders(!this.showLastSenders());
};

CSenderListControllerView.prototype.setLastSendersMaxHeight = function ()
{
	if (this.lastSendersDom()) {
		this.lastSendersMaxHeight(this.lastSendersDom().children().first().outerHeight());
	}
};

CSenderListControllerView.prototype.onShow = function ()
{
	this.setLastSendersMaxHeight();
	this.populateSenders();
};

CSenderListControllerView.prototype.populateSenders = function (forceSync = false)
{
	if (!MailCache) {
		return;
	}
	if (MailCache.folderList().iAccountId !== MailCache.currentAccountId()) {
		const subscription = MailCache.folderList.subscribe(() => {
			subscription.dispose();
			this.populateSenders();
		});
		return;
	}
	const senders = Types.pArray(Storage.getData(`customSenderList-${MailCache.currentAccountId()}`));
	this.senders(senders.map(sender => {
		return {
			email: sender.email,
			count: sender.count,
			selected: ko.observable(false)
		};
	}));

	const currentSettings = {
		SearchPeriod: Settings.SearchPeriod,
		SearchFolders: Settings.SearchFolders
	};
	if (JSON.stringify(currentSettings) !== JSON.stringify(this.savedCurrentSettings)) {
		this.syncedAccounts = [];
		this.savedCurrentSettings = currentSettings;
	}
	if (this.syncedAccounts.includes(MailCache.currentAccountId()) && !forceSync) {
		return;
	}
	this.syncedAccounts.push(MailCache.currentAccountId());

	const parameters = {
		AccountID: MailCache.currentAccountId(),
		Period: getSearchPeriod(),
		Folders: getSearchFolders()
	};
	this.isLoading(true);
	Ajax.send('%ModuleName%', 'GetSenders', parameters, (response, request) => {
		this.isLoading(false);
		if (response && response.Result) {
			const senders = Object.keys(response.Result).map(function(email) {
				const count = response.Result[email];
				return { email, count, selected: ko.observable(false) };
			});
			senders.sort((a, b) => b.count - a.count);
			this.senders(senders.slice(0, 20));
			Storage.setData(`customSenderList-${parameters.AccountID}`, senders);
		}
	});
};

CSenderListControllerView.prototype.searchMessagesForSender = function (email)
{
	const searchMessagesInInbox = ModulesManager.run('MailWebclient', 'getSearchMessagesInInbox');
	searchMessagesInInbox(`from:${email} folders:all`);
};

module.exports = new CSenderListControllerView();
