const contractInfo = require('./contract.json');
const web3 = require('web3');

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
function getWeb3() {
  return g_web3;
}


function mapStringsAdd(val, callback) {
  const data = g_contract.addMapStrings.getData(val);
  personalSendTransaction(data, function(error, result) {
    if (error) {
      callback(error);
    } else {
      _waitForEvent(result, callback);
    }
  });
}
function mapBytesAdd(val, callback) {
  const data = g_contract.addMapBytes.getData(val);
  personalSendTransaction(data, function(error, result) {
    if (error) {
      callback(error);
    } else {
      _waitForEvent(result, callback);
    }
  });
}
function arrayStringsAdd(val, callback) {
  const data = g_contract.addArrayStrings.getData(val);
  personalSendTransaction(data, function(error, result) {
    if (error) {
      callback(error);
    } else {
      _waitForEvent(result, callback);
    }
  });
}
function arrayBytesAdd(val, callback) {
  const data = g_contract.addArrayBytes.getData(val);
  personalSendTransaction(data, function(error, result) {
    if (error) {
      callback(error);
    } else {
      _waitForEvent(result, callback);
    }
  });
}

function mapStrings(index, callback) {
  g_contract.mapStrings(index, callback);
}
function mapBytes(index, callback) {
  g_contract.mapBytes(index, callback);
}
function arrayStrings(index, callback) {
  g_contract.arrayStrings(index, callback);
}
function arrayBytes(index, callback) {
  g_contract.arrayBytes(index, callback);
}

function mapStringsLength(callback) {
  g_contract.mapStringsLength(callback);
}
function mapBytesLength(callback) {
  g_contract.mapBytesLength(callback);
}
function arrayStringsLength(callback) {
  g_contract.arrayStringsLength(callback);
}
function arrayBytesLength(callback) {
  g_contract.arrayBytesLength(callback);
}

function _waitForEvent(txhash, callback) {
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
  if (!g_createDocumentCallbacks[txhash]) {
    g_createDocumentCallbacksCount++;
    g_createDocumentCallbacks[txhash] = callback;
  }
}
function personalSendTransaction(data, callback) {
  g_web3.personal.sendTransaction({'to': g_contractAddress, 'gas': GAS_LIMIT, 'data': data},
                                  g_defaultAccountPassphrase,
                                  callback);
}

module.exports.setServer = setServer;
module.exports.setAccount = setAccount;
module.exports.getAccounts = getAccounts;
module.exports.getWeb3 = getWeb3;

module.exports.mapStringsAdd = mapStringsAdd;
module.exports.mapBytesAdd = mapBytesAdd;
module.exports.arrayStringsAdd = arrayStringsAdd;
module.exports.arrayBytesAdd = arrayBytesAdd;

module.exports.mapStrings = mapStrings;
module.exports.mapBytes = mapBytes;
module.exports.arrayStrings = arrayStrings;
module.exports.arrayBytes = arrayBytes;

module.exports.mapStringsLength = mapStringsLength;
module.exports.mapBytesLength = mapBytesLength;
module.exports.arrayStringsLength = arrayStringsLength;
module.exports.arrayBytesLength = arrayBytesLength;