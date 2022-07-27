'use strict';

const
	_ = require('underscore'),
	ko = require('knockout'),

	TextUtils = require('%PathToCoreWebclientModule%/js/utils/Text.js'),

	App = require('%PathToCoreWebclientModule%/js/App.js'),
	Ajax = require('%PathToCoreWebclientModule%/js/Ajax.js')
;

function CSenderListControllerView()
{
	this.visible = ko.observable(false);
	this.senders = ko.observableArray([]);
	this.sendersExpanded = ko.observable(false);
}

CSenderListControllerView.prototype.ViewTemplate = '%ModuleName%_SenderListControllerView';

CSenderListControllerView.prototype.triggerSendersExpanded = function ()
{
	this.sendersExpanded(!this.sendersExpanded());
};

CSenderListControllerView.prototype.onShow = function ()
{
	console.log('onShow');
	if (!_.isFunction(App.currentAccountId)) {
		return;
	}

	const parameters = {
		'AccountID': App.currentAccountId()
	};
	Ajax.send('%ModuleName%', 'GetSavedSenders', parameters, (response, request) => {
		if (response && response.Result) {
			console.log({Result: response.Result});
			const senders = Object.keys(response.Result).map(function(email) {
				const count = response.Result[email];
				return {count, email};
			});
			senders.sort((a, b) => b.count - a.count);
			console.log({senders});
			this.visible(true);
			this.senders(senders);
		}
	});
};

module.exports = new CSenderListControllerView();
