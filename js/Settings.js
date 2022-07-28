'use strict';

const
	_ = require('underscore'),

	Types = require('%PathToCoreWebclientModule%/js/utils/Types.js')
;

module.exports = {
	NumberOfSendersToDisplay: 3,
	TimeFrame: 1,
	SearchIn: 2,

	/**
	 * Initializes settings from AppData object sections.
	 * 
	 * @param {Object} appData Object contained modules settings.
	 */
	init: function (appData)
	{
		const appDataSection = appData['%ModuleName%'];

		if (!_.isEmpty(appDataSection)) {
			this.NumberOfSendersToDisplay = Types.pInt(appDataSection.NumberOfSendersToDisplay, this.NumberOfSendersToDisplay);
			this.TimeFrame = Types.pInt(appDataSection.TimeFrame, this.TimeFrame);
			this.SearchIn = Types.pInt(appDataSection.SearchIn, this.SearchIn);
		}
	},
	
	/**
	 * Updates new settings values after saving on server.
	 * 
	 * @param {number} iNumberOfSendersToDisplay
	 * @param {number} iTimeFrame
	 * @param {number} iSearchIn
	 */
	update: function (iNumberOfSendersToDisplay, iTimeFrame, iSearchIn)
	{
		this.NumberOfSendersToDisplay = iNumberOfSendersToDisplay;
		this.TimeFrame = iTimeFrame;
		this.SearchIn = iSearchIn;
	}
};
