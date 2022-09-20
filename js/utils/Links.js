'use strict';

const MailLinksUtils = require('modules/MailWebclient/js/utils/Links.js');

const LinksUtils = {
	getMailbox: MailLinksUtils.getMailbox,
	getComposeFromMessage: MailLinksUtils.getComposeFromMessagep,

	parseMailbox (params) {
		const parsedParams = MailLinksUtils.parseMailbox(params);
		let searchParts = parsedParams.Search.split(' ');
		const senderSearchPart = searchParts.find(part => part.substr(0, 7) === 'sender:');
		if (senderSearchPart) {
			searchParts = searchParts.filter(part => {
				return part !== senderSearchPart;
			});
			parsedParams.Search = searchParts.join(' ');
			parsedParams.CurrentSender = senderSearchPart.substr(7);
		} else {
			parsedParams.CurrentSender = '';
		}
		return parsedParams;
	}
};

module.exports = LinksUtils;
