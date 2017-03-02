'use strict';

var fs = require('fs');
var path = require('path');
var Contract = require('./index');

try {
	if (process.argv.length >= 5) {
		var serverUrl = process.argv[2];
		var account = process.argv[3];
		var accountPassphrase = process.argv[4];
		Contract.setServer(serverUrl);
		Contract.setAccount(account, accountPassphrase);

		Contract.getFilesCount(function(error, result) {
			if (error) {
				console.log(error);
			} else {
				console.log('getFilesCount:' + result);
			}
		});
		Contract.getRecordsCount(function(error, result) {
			if (error) {
				console.log(error);
			} else {
				console.log('getRecordsCount:' + result);
			}
		});
	} else {
		console.log('argv');
	}
}
catch (e) {
	console.log(e);
}
