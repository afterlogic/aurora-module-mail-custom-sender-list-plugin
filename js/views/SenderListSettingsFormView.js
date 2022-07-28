'use strict';

const
	_ = require('underscore'),
	ko = require('knockout'),

	TextUtils = require('%PathToCoreWebclientModule%/js/utils/Text.js'),
	Types = require('%PathToCoreWebclientModule%/js/utils/Types.js'),

	ModulesManager = require('%PathToCoreWebclientModule%/js/ModulesManager.js'),
	CAbstractSettingsFormView = ModulesManager.run('SettingsWebclient', 'getAbstractSettingsFormViewClass'),

	Settings = require('modules/%ModuleName%/js/Settings.js')
;

/**
 * @constructor
 */
function CSenderListSettingsFormView()
{
	CAbstractSettingsFormView.call(this, '%ModuleName%');

	this.numberOfSendersToDisplay = ko.observable(Settings.NumberOfSendersToDisplay);
	this.timeFrameValues = [
		{ value: 0, label: TextUtils.i18n('%MODULENAME%/LABEL_TIME_RECENT') },
		{ value: 1, label: TextUtils.i18n('%MODULENAME%/LABEL_TIME_LAST_YEAR') },
		{ value: 2, label: TextUtils.i18n('%MODULENAME%/LABEL_TIME_ALL_TIME') }
	];
	this.timeFrame = ko.observable(Settings.TimeFrame);
	this.searchInValues = [
		{ value: 0, label: TextUtils.i18n('%MODULENAME%/LABEL_SEARCH_IN_ALL_FOLDERS') },
		{ value: 1, label: TextUtils.i18n('%MODULENAME%/LABEL_SEARCH_IN_INBOX') },
		{ value: 2, label: TextUtils.i18n('%MODULENAME%/LABEL_SEARCH_IN_INBOX_AND_SUBFOLDERS') }
	];
	this.searchIn = ko.observable(Settings.SearchIn);
}

_.extendOwn(CSenderListSettingsFormView.prototype, CAbstractSettingsFormView.prototype);

CSenderListSettingsFormView.prototype.ViewTemplate = '%ModuleName%_SenderListSettingsFormView';

CSenderListSettingsFormView.prototype.getCurrentValues = function ()
{
	return [
		this.numberOfSendersToDisplay(),
		this.timeFrame(),
		this.searchIn()
	];
};

CSenderListSettingsFormView.prototype.revertGlobalValues = function ()
{
	this.numberOfSendersToDisplay(Settings.NumberOfSendersToDisplay);
	this.timeFrame(Settings.TimeFrame);
	this.searchIn(Settings.SearchIn);
};

CSenderListSettingsFormView.prototype.getParametersForSave = function ()
{
	const parameters = {
		'NumberOfSendersToDisplay': Types.pInt(this.numberOfSendersToDisplay()),
		'TimeFrame': this.timeFrame(),
		'SearchIn': this.searchIn()
	};
	return parameters;
};

CSenderListSettingsFormView.prototype.applySavedValues = function (parameters)
{
	Settings.update(parameters.NumberOfSendersToDisplay, parameters.TimeFrame, parameters.SearchIn);
};

module.exports = new CSenderListSettingsFormView();
