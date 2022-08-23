'use strict';

const
	ko = require('knockout'),

	Types = require('%PathToCoreWebclientModule%/js/utils/Types.js'),

	Ajax = require('%PathToCoreWebclientModule%/js/Ajax.js'),
	ModulesManager = require('%PathToCoreWebclientModule%/js/ModulesManager.js'),
	Storage = require('%PathToCoreWebclientModule%/js/Storage.js'),

	MailCache = ModulesManager.run('MailWebclient', 'getMailCache'),

	Settings = require('modules/%ModuleName%/js/Settings.js')
;

function getSearchPeriod ()
{
	if (Settings.SearchPeriod === 'all') {
		return '';
	}
	return Settings.SearchPeriod;
}

function getSearchFoldersArray ()
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

function prepareSenders(senders) {
	const mainSenders = senders
			.filter(sender => sender.count >= 2)
			.map(sender => ({
				label: sender.email,
				value: sender.email,
				count: sender.count,
				selected: ko.observable(false)
			}))
	;
	const restSenders = senders.filter(sender => sender.count < 2);
	const restSendersEmail = restSenders.map(sender => sender.email).join(',');
	const restSendersCount = restSenders
			.map(sender => sender.count)
			.reduce((accumulator, count) => accumulator + count, 0);
	mainSenders.push({
		label: 'Rest mails',
		value: restSendersEmail,
		count: restSendersCount,
		selected: ko.observable(false)
	});
	return mainSenders;
}

function getFromStorage() {
	const senders = Types.pArray(Storage.getData(`customSenderList-${MailCache.currentAccountId()}`));
	return prepareSenders(senders);
}

let syncedAccounts = [];
let savedCurrentSettings = {};

function needToSync() {
	const currentSettings = {
		SearchPeriod: Settings.SearchPeriod,
		SearchFolders: Settings.SearchFolders
	};
	if (JSON.stringify(currentSettings) !== JSON.stringify(savedCurrentSettings)) {
		syncedAccounts = [];
		savedCurrentSettings = currentSettings;
	}
	if (syncedAccounts.includes(MailCache.currentAccountId()) && !forceSync) {
		return false;
	}
	syncedAccounts.push(MailCache.currentAccountId());
	return true;
}

function getFromServer() {
	return new Promise((resolve, reject) => {
		const parameters = {
			AccountID: MailCache.currentAccountId(),
			Period: getSearchPeriod(),
			Folders: getSearchFoldersArray()
		};
		Ajax.send('%ModuleName%', 'GetSenders', parameters, (response, request) => {
			if (response && response.Result) {
				const senders = Object.keys(response.Result).map(email => ({
					email,
					count: response.Result[email]
				}));
				senders.sort((a, b) => b.count - a.count);
				Storage.setData(`customSenderList-${parameters.AccountID}`, senders);
				resolve(prepareSenders(senders));
			}
		});
	});
}

module.exports = {
	getFromStorage,
	needToSync,
	getFromServer
};
