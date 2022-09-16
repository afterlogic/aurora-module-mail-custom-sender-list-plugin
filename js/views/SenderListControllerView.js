'use strict';

const { doAfterPopulatingMessage } = require('../../../MailWebclient/js/views/MessagePaneView');

const
	ko = require('knockout'),
	_ = require('underscore'),

	App = require('%PathToCoreWebclientModule%/js/App.js'),
	ModulesManager = require('%PathToCoreWebclientModule%/js/ModulesManager.js'),
	Storage = require('%PathToCoreWebclientModule%/js/Storage.js'),

	MailCache = ModulesManager.run('MailWebclient', 'getMailCache'),
	MailSettings = require('modules/MailWebclient/js/Settings.js'),

	SendersUtils = require('modules/%ModuleName%/js/utils/senders.js'),
	Settings = require('modules/%ModuleName%/js/Settings.js'),
	Routing = require('%PathToCoreWebclientModule%/js/Routing.js'),
	LinksUtils = require('modules/MailWebclient/js/utils/Links.js'),
	CMessageListView = require('modules/%ModuleName%/js/views/CMessageListView.js')
;

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
	this.currentSender = ko.observable('');
	this.senders = ko.observableArray([]);
	this.sendersExpanded = ko.observable(!!Storage.getData('sendersExpanded'));
	this.isLoading = ko.observable(false);
	this.messageList = null;

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
		MailCache.currentAccountId.subscribe(() => {
			this.populateSenders();
		});
	}

	App.subscribeEvent('MailWebclient::ConstructView::after', params => {
		if ('CMessageListView' === params.Name) {
			this.messageListView = params.View;
		}
		if ('CMailView' === params.Name) {
			this.mailView = params.View;
			this.messageList = new CMessageListView(this.mailView.openMessageInNewWindowBound);
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

CSenderListControllerView.prototype.getCurrentSearchSender = function ()
{
	return this.senders().find(sender => {
		return this.currentSender() === sender.value;
	}) || null;
}

CSenderListControllerView.prototype.onShow = function ()
{
	this.setLastSendersMaxHeight();
	this.populateSenders();
};

CSenderListControllerView.prototype.onRoute = function (aParams)
{
	if (this.selectedSender) {
		this.selectedSender.selected(false);
		this.selectedSender = null;
	}
	if (this.mailView && aParams[1] && aParams[1] === '__senders__') {
		var
			oParams = LinksUtils.parseMailbox(aParams),
			aSearchParts = oParams.Search.split(' ')
		;
		_.each(aSearchParts, function(item) {
			if (item.substr(0, 7) === 'sender:') {
				this.currentSender(item.substr(7));
			}
		}, this);
		const sender = this.getCurrentSearchSender();
		if (sender) {
			const inboxFolder = MailCache.folderList().inboxFolder();
			console.log(inboxFolder);
			if (inboxFolder) {
				inboxFolder.selected(false);
			}
			sender.selected(true);
			this.selectedSender = sender;
			this.sendersExpanded(true);
			if (this.lastSenders().find(lastSender => lastSender.value === sender.value)) {
				this.setLastSendersMaxHeight();
				this.showLastSenders(true);
			}
		}
		this.mailView.setCustomMessageList('%ModuleName%', this.messageList);
	} else {
		this.mailView.removeCustomMessageList('%ModuleName%', this.messageList);
	}
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
	var
		AccountList = require('modules/MailWebclient/js/AccountList.js'),
		oCurrAccount = AccountList.getCurrent(),
		sAccountHash = oCurrAccount ? oCurrAccount.hash() : '';

	Routing.replaceHash([
		'mail', 
		sAccountHash, 
		'__senders__', 
		'sender:' + email
	]);
};

module.exports = new CSenderListControllerView();
