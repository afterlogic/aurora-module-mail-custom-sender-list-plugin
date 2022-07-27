'use strict';

const
	_ = require('underscore'),

	Types = require('%PathToCoreWebclientModule%/js/utils/Types.js')
;

module.exports = {
	SendersCount: 3,
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
console.log({appDataSection});
		if (!_.isEmpty(appDataSection)) {
			this.SendersCount = Types.pInt(appDataSection.SendersCount, this.SendersCount);
			this.TimeFrame = Types.pInt(appDataSection.TimeFrame, this.TimeFrame);
			this.SearchIn = Types.pInt(appDataSection.SearchIn, this.SearchIn);
		}
	},
	
	/**
	 * Updates new settings values after saving on server.
	 * 
	 * @param {number} iSendersCount
	 * @param {number} iTimeFrame
	 * @param {number} iSearchIn
	 */
	update: function (iSendersCount, iTimeFrame, iSearchIn)
	{
		this.SendersCount = iSendersCount;
		this.TimeFrame = iTimeFrame;
		this.SearchIn = iSearchIn;
	}
};
