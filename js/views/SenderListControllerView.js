'use strict';

const
	_ = require('underscore'),
	ko = require('knockout'),

	TextUtils = require('%PathToCoreWebclientModule%/js/utils/Text.js'),

	App = require('%PathToCoreWebclientModule%/js/App.js'),
	Ajax = require('%PathToCoreWebclientModule%/js/Ajax.js'),
	ModulesManager = require('%PathToCoreWebclientModule%/js/ModulesManager.js'),

	MailCache = ModulesManager.run('MailWebclient', 'getMailCache'),
	MailSettings = require('modules/MailWebclient/js/Settings.js')
;

function CSenderListControllerView()
{
	this.visible = ko.observable(false);
	this.senders = ko.observableArray([]);
	this.sendersExpanded = ko.observable(false);

	ko.computed(function () {
		const
			uidList = MailCache.uidList(),
			accountId = uidList.iAccountId,
			folderFullName = uidList.sFullName,
			inboxFolder = MailCache.folderList().inboxFolder(),
			inboxFolderFullName = MailCache.folderList().inboxFolderFullName(),
			search = uidList.search(),
			filters = uidList.filters(),
			sortBy = uidList.sortBy(),
			sortOrder = uidList.sortOrder(),
			sendersSearches = this.senders().map(sender => `from:${sender.email} folders:all`)
		;
		if (folderFullName === inboxFolderFullName && search !== '' && filters === '' &&
				sortBy === MailSettings.MessagesSortBy.DefaultSortBy &&
				sortOrder === MailSettings.MessagesSortBy.DefaultSortOrder
		) {
			this.senders().forEach(sender => {
				sender.selected(search === `from:${sender.email} folders:all`);
				if (sender.selected() && inboxFolder) {
					inboxFolder.selected(false);
					this.sendersExpanded(true);
				}
			});
		} else {
			this.senders().forEach(sender => {
				sender.selected(false);
			});
		}
	}, this);
}

CSenderListControllerView.prototype.ViewTemplate = '%ModuleName%_SenderListControllerView';

CSenderListControllerView.prototype.triggerSendersExpanded = function ()
{
	this.sendersExpanded(!this.sendersExpanded());
};

CSenderListControllerView.prototype.onShow = function ()
{
	if (!_.isFunction(App.currentAccountId)) {
		return;
	}

	const parameters = {
		'AccountID': App.currentAccountId()
	};
	Ajax.send('%ModuleName%', 'GetSavedSenders', parameters, (response, request) => {
		if (response && response.Result) {
			const senders = Object.keys(response.Result).map(function(email) {
				const count = response.Result[email];
				return {email, count, selected: ko.observable(false)};
			});
			senders.sort((a, b) => b.count - a.count);
			this.visible(true);
			this.senders(senders);
		}
	});
};

CSenderListControllerView.prototype.searchMessagesForSender = function (email)
{
	const searchMessagesInInbox = ModulesManager.run('MailWebclient', 'getSearchMessagesInInbox');
	searchMessagesInInbox(`from:${email} folders:all`);
};

module.exports = new CSenderListControllerView();
