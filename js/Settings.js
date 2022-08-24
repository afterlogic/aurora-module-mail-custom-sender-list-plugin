'use strict';

const
	_ = require('underscore'),

	Types = require('%PathToCoreWebclientModule%/js/utils/Types.js')
;

module.exports = {
	SenderFolderMinMessagesCount: 2,
	NumberOfSendersToDisplay: 3,
	SearchPeriod: '1 month',
	SearchFolders: 'inbox',

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
			this.SearchFolders = Types.pString(appDataSection.SearchFolders, this.SearchFolders);
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
		this.SearchFolders = searchFolders;
	}
};
