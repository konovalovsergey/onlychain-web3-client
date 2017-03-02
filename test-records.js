'use strict';

const cluster = require('cluster');
const randomstring = require('randomstring');
const Contract = require('./index');

var g_recordMined = 0;

if (process.argv.length >= 9) {
	const serverUrl = process.argv[2];
	const account = process.argv[3];
	const accountPassphrase = process.argv[4];
	const threadsCount = parseInt(process.argv[5]);
	const filesCount = parseInt(process.argv[6]);
	const fileSize = parseInt(process.argv[7]);
	const wait = parseInt(process.argv[8]);

	if (cluster.isMaster) {
		for (let i = 0; i < threadsCount; ++i) {
			cluster.fork();
		}
		cluster.on('exit', (worker, code, signal) => {
			console.log('worker %s died (code = %s; signal = %s).', worker.process.pid, code, signal);
		});
	} else {
		console.log('process.argv:' + JSON.stringify(process.argv));

		Contract.setServer(serverUrl);
		Contract.setAccount(account, accountPassphrase);

		Contract.getFilesCount(function(error, result) {
			if (error) {
				console.log(error);
				process.exit();
			} else {
				console.log('getFilesCount:' + result);
				if (0 == wait || 1 == wait) {
					createRecords(filesCount, filesCount, result, fileSize, wait, function(error) {
						if (error) {
							console.log(error);
						} else {
							console.log('end');
						}
						process.exit();
					});
				} else {
					let start = Date.now();
					let counter = 0;
					for (let i = 0; i < filesCount; ++i) {
						console.log('createRecords start:');
						Contract.createRecord(getRandomInt(0, result), randomstring.generate(fileSize), function() {
							if (error) {
								console.log(error);
							} else {
								console.log('recordMined:' + (Date.now() - start));
							}
							counter++;
							if (counter >= filesCount) {
								console.log('end');
								process.exit();
							}
						});
					}
				}
			}
		});
	}
} else {
	console.log('argv');
}

process.on('uncaughtException', (err) => {
	console.log((new Date).toUTCString() + ' uncaughtException:', err.message);
	console.log(err.stack);
	process.exit();
});

function createRecords(count, filesCount, templatesCount, fileSize, wait, callback) {
	if (count > 0) {
		let start = Date.now();
		let callback1 = function() {
			g_recordMined++;
			console.log('recordMined:' + g_recordMined);
			if (g_recordMined >= filesCount) {
				callback();
			}
		};
		let callback2 = function(error) {
			if (error) {
				callback(error);
			} else {
				console.log('createRecords:' + (Date.now() - start));
				createRecords(count - 1, filesCount, templatesCount, fileSize, wait, callback);
			}
		};
		if (wait) {
			callback1 = callback2;
			callback2 = null;
		}
		Contract.createRecord(getRandomInt(0, templatesCount), randomstring.generate(fileSize), callback1, callback2);
	} else {
		if (wait) {
			callback();
		} else {
			console.log('wait mining');
		}
	}
}

function getRandomInt(min, max) {
	return Math.floor(Math.random() * (max - min)) + min;
}
