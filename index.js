const contractInfo = require('./contract.json');
const web3 = require('web3');

const CHUNK_SIZE = 40000;
const GAS_LIMIT = 0x33333333;

var g_web3;
var g_contract;
var g_contractAddress;
var g_defaultAccount;
var g_defaultAccountPassphrase;
var g_createDocumentCallbacks = {};
var g_createDocumentCallbacksCount = 0;
var g_transactionCallbacks = {};

function setServer(serverUrl, opt_contractAbi, opt_contractAddress) {
	const contractAbi = opt_contractAbi ? opt_contractAbi : contractInfo.contractAbi;
	g_contractAddress = opt_contractAddress ? opt_contractAddress : contractInfo.contractAddress;
	g_web3 = new web3(new web3.providers.HttpProvider(serverUrl));
	g_contract = g_web3.eth.contract(contractAbi).at(g_contractAddress);
}
function setAccount(account, accountPassphrase) {
	g_defaultAccount = account;
	g_defaultAccountPassphrase = accountPassphrase;

	g_web3.eth.defaultAccount = g_defaultAccount;
}
function getAccounts(callback) {
	if (g_web3) {
		g_web3.eth.getAccounts(callback);
	} else {
		callback(undefined, []);
	}
}

function writeFile(name, data, thumbnail, callback) {
	const dataSize = Math.ceil(data.length / CHUNK_SIZE);
	const thumbnailSize = Math.ceil(thumbnail.length / CHUNK_SIZE);
	const meta = JSON.stringify({name: name, dataSize: dataSize, thumbnailSize: thumbnailSize});

	const createDocumentData = g_contract.createDocument.getData(meta);
	personalSendTransaction(createDocumentData, function(error, result) {
		if (error) {
			callback(error);
		} else {
			if (0 == g_createDocumentCallbacksCount) {
				var event = g_contract.DocumentEvent(null, null, function(error, result) {
					if (error) {
						console.log(error);
					} else {
						var _callback = g_createDocumentCallbacks[result.transactionHash];
						if (_callback) {
							delete g_createDocumentCallbacks[result.transactionHash];
							g_createDocumentCallbacksCount--;
							if (0 == g_createDocumentCallbacksCount) {
								event.stopWatching();
							}
							_callback(undefined, result.args['docId']);
						}
					}
				});
			}
			if (!g_createDocumentCallbacks[result]) {
				g_createDocumentCallbacksCount++;
				g_createDocumentCallbacks[result] = function(error, docId) {
					if (error) {
						callback(error);
					} else {
						_writeChunks(docId, data, thumbnail, 0, callback);
					}
				};
			}
		}
	});
}
function readFile(docId, callback) {
	//docId++;//todo starts with 1
	g_contract.docBase(docId, function(error, result) {
		if (error) {
			callback(error);
		} else {
			var chunks = [];
			const blocksCount = result[0];
			const meta = result[2];
			if (blocksCount > 0) {
				_readChunks(docId, meta, 0, blocksCount, chunks, callback);
			} else {
				callback(new Error('readFile'));
			}
		}
	});
}
function getFilesCount(callback) {
	g_contract.documentsCount(callback);
}

function createRecord(docId, data, callback, opt_callbackSendTransaction) {
	//docId++;//todo starts with 1
	const createRecordData = g_contract.createRecord.getData(docId, data);
	personalSendTransaction(createRecordData, function(error, result) {
		if (opt_callbackSendTransaction) {
			opt_callbackSendTransaction(error, callback);
		}
		if (error) {
			callback(error);
		} else {
			_waitForTx(result, callback);
		}
	});
}
function getRecord(index, callback) {
	g_contract.getRecord(index, function(error, result) {
		if (error) {
			callback(error);
		} else {
			if (callback) {
				callback(undefined, {'docId': result[0], 'data': result[1]});
			}
		}
	});
}
function getRecordsCount(callback) {
	g_contract.getRecordsCount(callback);
}

function _writeChunks(docId, data, thumbnail, index, callback) {
	const dataToWrite = data ? data : thumbnail;
	const dataEncoded = encodeHex(dataToWrite.subarray(index, index + CHUNK_SIZE));
	const addTextData = g_contract.addBlock.getData(docId, dataEncoded);
	personalSendTransaction(addTextData, function(error, result) {
		if (error) {
			callback(error);
		} else {
			if (index + CHUNK_SIZE < dataToWrite.length) {
				_writeChunks(docId, data, thumbnail, index + CHUNK_SIZE, callback);
			} else if (null != data) {
				_writeChunks(docId, null, thumbnail, 0, callback);
			} else {
				_waitForTx(result, function(error) {
					callback(error, docId);
				});
			}
		}
	});
}
function _readChunks(docId, meta, index, count, chunks, callback) {
	g_contract.getBlock(docId, index, function(error, result) {
		if (error) {
			callback(error);
		} else {
			chunks.push(decodeHex(result));
			if (index + 1 < count) {
				_readChunks(docId, meta, index + 1, count, chunks, callback);
			} else {
				callback(undefined, _assembleChunks(meta, chunks));
			}
		}
	});
}
function _assembleChunks(metaStr, chunks) {
	var res = null;
	if (chunks.length > 0) {
		const meta = JSON.parse(metaStr);
		var dataSize = 0;
		var thumbnailSize = 0;
		var dataChunks = [];
		var thumbnailChunks = [];
		for (var i = 0; i < chunks.length; ++i) {
			var dataCur = chunks[i];
			if (dataChunks.length < meta.dataSize) {
				dataSize += dataCur.length;
				dataChunks.push(dataCur);
			} else {
				thumbnailSize += dataCur.length;
				thumbnailChunks.push(dataCur);
			}
		}
		var dataBinary = new Uint8Array(dataSize);
		var cur = 0;
		for (var i = 0; i < dataChunks.length; ++i) {
			var chunk = dataChunks[i];
			if (0 == i) {
				dataBinary.set(chunk);
			} else {
				dataBinary.set(chunk, cur);
			}
			cur += chunk.length;
		}
		var thumbnailBinary = new Uint8Array(thumbnailSize);
		cur = 0;
		for (var i = 0; i < thumbnailChunks.length; ++i) {
			var chunk = thumbnailChunks[i];
			if (0 == i) {
				thumbnailBinary.set(chunk);
			} else {
				thumbnailBinary.set(chunk, cur);
			}
			cur += chunk.length;
		}
		res = {'name': meta.name, 'data': dataBinary, 'thumbnail': thumbnailBinary};
	}
	return res;
}
function _waitForTx(txhash, callback) {
	g_transactionCallbacks[txhash] = callback;
	const filter = g_web3.eth.filter('latest');
	filter.watch(function(error, result) {
		if (error) {
			var _callback = g_transactionCallbacks[txhash];
			if(_callback){
				delete g_transactionCallbacks[txhash];
				_callback(error);
			}
		} else {
			g_web3.eth.getTransactionReceipt(txhash, function(error, result){
				if (error) {
					var _callback = g_transactionCallbacks[txhash];
					if(_callback){
						delete g_transactionCallbacks[txhash];
						_callback(error);
					}
				} else {
					if (result && result.transactionHash == txhash) {
						filter.stopWatching();
						var _callback = g_transactionCallbacks[txhash];
						if(_callback){
							delete g_transactionCallbacks[txhash];
							_callback(undefined, result);
						}
					}
				}
			});
			
		}
	});
}
function personalSendTransaction(data, callback) {
	g_web3.personal.sendTransaction({'to': g_contractAddress, 'gas': GAS_LIMIT, 'data': data},
									g_defaultAccountPassphrase,
									callback);
}
function decodeHex(s) {
	var o = [];
	var alpha = '0123456789abcdef';
	for (var i = (s.substr(0, 2) == '0x' ? 2 : 0); i < s.length; i += 2) {
		var index1 = alpha.indexOf(s[i]);
		var index2 = alpha.indexOf(s[i + 1]);
		if (index1 < 0 || index2 < 0)
			throw("Bad input to hex decoding: " + s + " " + i + " " + index1 + " " + index2)
		o.push(index1 * 16 + index2);
	}
	return o;
}
function encodeHex(val) {
	var res = '';
	for (var i = 0; i < val.length; ++i) {
		var hex = val[i].toString(16);
		if (hex.length > 1) {
			res += hex;
		} else {
			res += '0' + hex;
		}
	}
	return '0x' + res;
}

module.exports.setServer = setServer;
module.exports.setAccount = setAccount;
module.exports.getAccounts = getAccounts;

module.exports.writeFile = writeFile;
module.exports.readFile = readFile;
module.exports.getFilesCount = getFilesCount;

module.exports.createRecord = createRecord;
module.exports.getRecord = getRecord;
module.exports.getRecordsCount = getRecordsCount;
