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
	this.searchPeriodValues = [
		{ value: '1 month', label: TextUtils.i18n('%MODULENAME%/LABEL_TIME_RECENT') },
		{ value: '1 year', label: TextUtils.i18n('%MODULENAME%/LABEL_TIME_LAST_YEAR') },
		{ value: 'all', label: TextUtils.i18n('%MODULENAME%/LABEL_TIME_ALL_TIME') }
	];
	this.searchPeriod = ko.observable(Settings.SearchPeriod);
	this.searchFoldersValues = [
		{ value: 'inbox', label: TextUtils.i18n('%MODULENAME%/LABEL_SEARCH_IN_INBOX') },
		{ value: 'inbox+subfolders', label: TextUtils.i18n('%MODULENAME%/LABEL_SEARCH_IN_INBOX_AND_SUBFOLDERS') },
		{ value: 'sent', label: TextUtils.i18n('%MODULENAME%/LABEL_SEARCH_IN_SENT') },
		{ value: 'all', label: TextUtils.i18n('%MODULENAME%/LABEL_SEARCH_IN_ALL_FOLDERS') }
	];
	this.searchFolders = ko.observable(Settings.searchFolders());
}

_.extendOwn(CSenderListSettingsFormView.prototype, CAbstractSettingsFormView.prototype);

CSenderListSettingsFormView.prototype.ViewTemplate = '%ModuleName%_SenderListSettingsFormView';

CSenderListSettingsFormView.prototype.getCurrentValues = function ()
{
	return [
		Types.pInt(this.numberOfSendersToDisplay(), Settings.NumberOfSendersToDisplay),
		this.searchPeriod(),
		this.searchFolders()
	];
};

CSenderListSettingsFormView.prototype.revertGlobalValues = function ()
{
	this.numberOfSendersToDisplay(Settings.NumberOfSendersToDisplay);
	this.searchPeriod(Settings.SearchPeriod);
	this.searchFolders(Settings.searchFolders());
};

CSenderListSettingsFormView.prototype.getParametersForSave = function ()
{
	return {
		'NumberOfSendersToDisplay': Types.pInt(this.numberOfSendersToDisplay(), Settings.NumberOfSendersToDisplay),
		'SearchPeriod': this.searchPeriod(),
		'SearchFolders': this.searchFolders()
	};
};

CSenderListSettingsFormView.prototype.applySavedValues = function (parameters)
{
	Settings.update(parameters.NumberOfSendersToDisplay, parameters.SearchPeriod, parameters.SearchFolders);
	this.numberOfSendersToDisplay(parameters.NumberOfSendersToDisplay);
};

module.exports = new CSenderListSettingsFormView();
