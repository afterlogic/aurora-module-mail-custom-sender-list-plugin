'use strict';

module.exports = function (appData) {
	const
		App = require('%PathToCoreWebclientModule%/js/App.js'),

		TextUtils = require('%PathToCoreWebclientModule%/js/utils/Text.js'),

		Settings = require('modules/%ModuleName%/js/Settings.js')
	;

	Settings.init(appData);

	if (!App.isUserNormalOrTenant()) {
		return null;
	}

	return {
		getSenderListSettingsFormView: function () {
			return SenderListControllerView;
		},

		start: function (ModulesManager) {
			if (!ModulesManager.isModuleEnabled('MailWebclient')) {
				return;
			}

			App.subscribeEvent('MailWebclient::RegisterFolderListController', function (registerFolderListController) {

				const SenderListControllerView = require('modules/%ModuleName%/js/views/SenderListControllerView.js');
				registerFolderListController(SenderListControllerView, 'UnderInboxFolder');
			});

			ModulesManager.run('SettingsWebclient', 'registerSettingsTab', [
				function () {
					return require('modules/%ModuleName%/js/views/SenderListSettingsFormView.js');
				},
				'sender_list',
				TextUtils.i18n('%MODULENAME%/LABEL_SETTINGS_TAB')
			]);
		}
	};
};
