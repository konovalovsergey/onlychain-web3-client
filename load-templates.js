'use strict';

var fs = require('fs');
var path = require('path');
var Contract = require('./index');

try {
	if (process.argv.length >= 3) {
		var serverUrl = process.argv[2];
		var account = process.argv[3];
		var accountPassphrase = process.argv[4];
		var templatesDir = process.argv[5];
		Contract.setServer(serverUrl);
		Contract.setAccount(account, accountPassphrase);
		console.log('templatesDir:' + templatesDir);
		var dirs = fs.readdirSync(templatesDir);
		var toWrite = [];
		for (var i = 0; i < dirs.length; ++i) {
			var dirName = dirs[i];
			console.log('dirName:' + dirName);
			var dirPath = path.resolve(templatesDir, dirName);
			var files = fs.readdirSync(dirPath);
			if (2 == files.length) {
				var dataPath;
				var thumbnailPath;
				if (files[0].endsWith('.bin')) {
					dataPath = path.resolve(dirPath, files[0]);
					thumbnailPath = path.resolve(dirPath, files[1]);
				} else {
					dataPath = path.resolve(dirPath, files[1]);
					thumbnailPath = path.resolve(dirPath, files[0]);
				}
				var data = fs.readFileSync(dataPath);
				var thumbnail = fs.readFileSync(thumbnailPath);
				console.log('data:' + data.length);
				console.log('thumbnail:' + thumbnail.length);
				toWrite.push([dirName, data, thumbnail]);
			}
		}
		writeFiles(toWrite, function(error) {
			if (error) {
				console.log(error);
			} else {
				checkWrite(function(error, result) {
					if (error) {
						console.log(error);
					} else {
						if (result) {
							console.log('name:' + result.name);
							console.log('data:' + result.data.length);
							console.log('thumbnail:' + result.thumbnail.length);
							//fs.writeFileSync('data', new Buffer(result.data));
							//fs.writeFileSync('thumbnail', new Buffer(result.thumbnail));
						} else {
							console.log('empty result');
						}
						console.log('end');
					}
				});
			}
		});
	} else {
		console.log('argv');
	}
}
catch (e) {
	console.log(e);
}

function writeFiles(toWrite, callback) {
	if (toWrite.length > 0) {
		console.log('toWrite:' + toWrite.length);
		var elem = toWrite.shift();
		Contract.writeFile(elem[0], elem[1], elem[2], function(error) {
			if (error) {
				callback(error);
			} else {
				writeFiles(toWrite, callback);
			}
		});
	} else {
		callback();
	}
}
function checkWrite(callback) {
	console.log('checkWrite');
	Contract.getFilesCount(function(error, count) {
		if (error) {
			callback(error);
		} else {
			console.log('count:' + count);
			Contract.readFile(count - 1, callback);
		}
	});
}
