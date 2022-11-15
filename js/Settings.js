'use strict';

const
	_ = require('underscore'),
	ko = require('knockout'),

	Types = require('%PathToCoreWebclientModule%/js/utils/Types.js'),

	ModulesManager = require('%PathToCoreWebclientModule%/js/ModulesManager.js'),
	MailCache = ModulesManager.run('MailWebclient', 'getMailCache')
;

module.exports = {
	SenderFolderMinMessagesCount: 2,
	NumberOfSendersToDisplay: 3,
	SearchPeriod: '1 month',
	searchFolders: ko.observable('inbox'),
	ServerModuleName: '%ModuleName%',
	SendersFolder: '__senders__',

	/**
	 * Initializes settings from AppData object sections.
	 * 
	 * @param {Object} appData Object contained modules settings.
	 */
	init: function (appData)
	{
		const appDataSection = appData['%ModuleName%'];

		if (!_.isEmpty(appDataSection)) {
			this.SenderFolderMinMessagesCount = Types.pInt(appDataSection.SenderFolderMinMessagesCount, this.SenderFolderMinMessagesCount);
			this.NumberOfSendersToDisplay = Types.pInt(appDataSection.NumberOfSendersToDisplay, this.NumberOfSendersToDisplay);
			this.SearchPeriod = Types.pString(appDataSection.SearchPeriod, this.SearchPeriod);
			this.searchFolders(Types.pString(appDataSection.SearchFolders, this.searchFolders()));
		}
	},

	/**
	 * Updates new settings values after saving on server.
	 * 
	 * @param {integer} numberOfSendersToDisplay
	 * @param {string} searchPeriod
	 * @param {string} searchFolders
	 */
	update: function (numberOfSendersToDisplay, searchPeriod, searchFolders)
	{
		this.NumberOfSendersToDisplay = numberOfSendersToDisplay;
		this.SearchPeriod = searchPeriod;
		this.searchFolders(searchFolders);
	}
};
