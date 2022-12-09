'use strict';

const
	ko = require('knockout'),
	_ = require('underscore'),

	App = require('%PathToCoreWebclientModule%/js/App.js'),
	ModulesManager = require('%PathToCoreWebclientModule%/js/ModulesManager.js'),
	Routing = require('%PathToCoreWebclientModule%/js/Routing.js'),
	Storage = require('%PathToCoreWebclientModule%/js/Storage.js'),
	TextUtils = require('%PathToCoreWebclientModule%/js/utils/Text.js'),

	MailCache = ModulesManager.run('MailWebclient', 'getMailCache'),

	LinksUtils = require('modules/%ModuleName%/js/utils/Links.js'),

	SendersUtils = require('modules/%ModuleName%/js/utils/Senders.js'),
	Settings = require('modules/%ModuleName%/js/Settings.js'),
	SettingsForm = require('modules/%ModuleName%/js/views/SenderListSettingsFormView.js'),

	CMessageListView = require('modules/%ModuleName%/js/views/CMessageListView.js')
;
function CSenderListControllerView()
{
	this.sSendersFolderName = TextUtils.i18n('%MODULENAME%/LABEL_SENDERS_FROM', {'FOLDER': ''});
	this.currentSenderEmail = ko.observable('');
	this.senders = ko.observableArray([]);
	this.sendersExpanded = ko.observable(!!Storage.getData('aurora_custom_senders-expanded'));
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

	this.sendersSettingsExpanded = ko.observable(false);
	this.searchFolders = SettingsForm.searchFolders;
	this.searchFoldersValues = SettingsForm.searchFoldersValues;
	this.onSelectFolderSettingBind = _.bind(this.onSelectFolderSetting, this);

	this.sendersFolderName = ko.computed(() => {
		const currentOption = this.searchFoldersValues.find((item) => item.value === this.searchFolders());
		const languageConstantName = currentOption.value === 'sent' ? '%MODULENAME%/LABEL_RECIPIENTS_FROM' : '%MODULENAME%/LABEL_SENDERS_FROM';

		return currentOption ? TextUtils.i18n(languageConstantName, {'FOLDER': currentOption.label})
			: TextUtils.i18n('%MODULENAME%/LABEL_SENDERS');
	});
	
	if (MailCache) {
		this.selectedSender = null;
	
		ko.computed(() => {
			if (this.selectedSender) {
				this.selectedSender.selected(false);
				this.selectedSender = null;
			}

			const sender = this.senders().find(sender => this.currentSenderEmail() === sender.value);
			if (sender) {
				$('html').addClass('custom-mail-sender-selected');
				sender.selected(true);
				this.selectedSender = sender;
				this.sendersExpanded(true);
				if (this.lastSenders().find(lastSender => lastSender.value === sender.value)) {
					this.setLastSendersMaxHeight();
					this.showLastSenders(true);
				}
			} else {
				$('html').removeClass('custom-mail-sender-selected');
			}
		}).extend({ throttle: 1 });
		MailCache.currentAccountId.subscribe(() => {
			this.populateSenders();
		});
	}

	Settings.searchFolders.subscribe(() => {
		this.populateSenders();
	});

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
	Storage.setData('aurora_custom_senders-expanded', this.sendersExpanded());
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

CSenderListControllerView.prototype.onRoute = function (aParams)
{
	if (!this.mailView) {
		return;
	}
	const parsedParams = LinksUtils.parseMailbox(aParams);
	if (parsedParams.Folder === Settings.SendersFolder) {
		this.currentSenderEmail(parsedParams.CurrentSender);
		this.mailView.setCustomMessageList('%ModuleName%', this.messageList);
	} else {
		this.currentSenderEmail('');
		this.mailView.removeCustomMessageList('%ModuleName%');
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
		if (this.currentSenderEmail() !== '') {
			const hasCurrentSenderEmail = !!this.senders().find(sender => sender.value === this.currentSenderEmail());
			if (hasCurrentSenderEmail) {
				App.broadcastEvent('%ModuleName%::SendersChanged::after');
			} else if (this.senders().length > 0) {
				this.searchMessagesForSender(this.senders()[0].value)
			} else {
				Routing.setHash(LinksUtils.getMailbox());
			}
		}

		this.isLoading(false);
	}
};

CSenderListControllerView.prototype.searchMessagesForSender = function (senderEmail)
{
	Routing.replaceHash(LinksUtils.getMailbox(Settings.SendersFolder, 1, '', `sender:${senderEmail}`));
};

CSenderListControllerView.prototype.openSettings = function ()
{
	this.sendersSettingsExpanded(!this.sendersSettingsExpanded());
};

CSenderListControllerView.prototype.onSelectFolderSetting = function (item)
{
	SettingsForm.searchFolders(item.value);
	SettingsForm.save();
	this.sendersSettingsExpanded(false);
};

var SenderListControllerView = new CSenderListControllerView();

module.exports = SenderListControllerView;
