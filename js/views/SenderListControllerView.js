'use strict';

const
	ko = require('knockout'),

	App = require('%PathToCoreWebclientModule%/js/App.js'),
	ModulesManager = require('%PathToCoreWebclientModule%/js/ModulesManager.js'),
	Storage = require('%PathToCoreWebclientModule%/js/Storage.js'),

	MailCache = ModulesManager.run('MailWebclient', 'getMailCache'),
	MailSettings = require('modules/MailWebclient/js/Settings.js'),

	SendersUtils = require('modules/%ModuleName%/js/utils/senders.js'),
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
			return search === `from:${sender.value}${getSearchFoldersString()}`;
		}) || null;
	}
	return null;
}

function getSearchFoldersString ()
{
	const inboxFolder = MailCache.folderList().inboxFolder();
	if (!inboxFolder) {
		return [];
	}
	switch (Settings.SearchFolders) {
		case 'inbox':
			return '';
		case 'inbox+subfolders':
			return ' folders:sub';
		default:
			return ' folders:all';
	}
}

function CSenderListControllerView()
{
	this.senders = ko.observableArray([]);
	this.sendersExpanded = ko.observable(!!Storage.getData('sendersExpanded'));
	this.isLoading = ko.observable(false);

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
				if (this.lastSenders().find(lastSender => lastSender.value === sender.value)) {
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

CSenderListControllerView.prototype.populateSenders = async function (forceSync = false)
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

	this.senders(SendersUtils.getFromStorage());

	if (SendersUtils.needToSync(forceSync)) {
		this.isLoading(true);
		this.senders(await SendersUtils.getFromServer());
		this.isLoading(false);
	}
};

CSenderListControllerView.prototype.searchMessagesForSender = function (email)
{
	const searchMessagesInInbox = ModulesManager.run('MailWebclient', 'getSearchMessagesInInbox');
	searchMessagesInInbox(`from:${email}${getSearchFoldersString()}`);
};

module.exports = new CSenderListControllerView();
