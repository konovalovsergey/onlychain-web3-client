const contractInfo = require('./contract.json');
const web3 = require('web3');
const BigNumber = require('bignumber.js');

const TIMEOUT = 15000;
const GAS_LIMIT = 0x33333333;

var g_web3;
var g_contract;
var g_contractAddress;
var g_defaultAccount;
var g_defaultAccountPassphrase;
var g_createDocumentCallbacks = {};
var g_createDocumentCallbackTimeouts = {};
var g_createDocumentCallbacksCount = 0;
var g_documentEvent;
var g_transactionCallbacks = {};
var g_transactionCallbackTimeouts = {};

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
      _waitForEvent(result, function(error, docId){
        callback(error, docId, result);
      });
    }
  });
}
function mapBytesAdd(val, callback) {
  const data = g_contract.addMapBytes.getData(encodeHex(val));
  personalSendTransaction(data, function(error, result) {
    if (error) {
      callback(error);
    } else {
      _waitForEvent(result, function(error, docId){
        callback(error, docId, result);
      });
    }
  });
}
function arrayStringsAdd(val, callback) {
  const data = g_contract.addArrayStrings.getData(val);
  personalSendTransaction(data, function(error, result) {
    if (error) {
      callback(error);
    } else {
      _waitForEvent(result, function(error, docId){
        callback(error, docId, result);
      });
    }
  });
}
function arrayBytesAdd(val, callback) {
  const data = g_contract.addArrayBytes.getData(encodeHex(val));
  personalSendTransaction(data, function(error, result) {
    if (error) {
      callback(error);
    } else {
      _waitForEvent(result, function(error, docId){
        callback(error, docId, result);
      });
    }
  });
}
function iterableMappingAdd(val, callback) {
  const hexString = g_web3.sha3(val);
  const hash = g_web3.toBigNumber(hexString);
  const data = g_contract.addIterableMapping.getData(hash, val);
  personalSendTransaction(data, function(error, result) {
    if (error) {
      callback(error);
    } else {
      _waitForTx(result, function(error){
        callback(error, hash, result);
      });
    }
  });
}
function addressArrayAdd(val, callback) {
  const hexString = g_web3.sha3(val);
  const hash = g_web3.toBigNumber(hexString);
  const data = g_contract.addAddressArray.getData(hash, val);
  personalSendTransaction(data, function(error, result) {
    if (error) {
      callback(error);
    } else {
      _waitForTx(result, function(error){
        callback(error, hash, result);
      });
    }
  });
}

function mapStrings(index, callback) {
  g_contract.mapStrings(index, callback);
}
function mapBytes(index, callback) {
  g_contract.mapBytes(index, function(error, val) {
    if (error) {
      callback(error);
    } else {
      callback(error, decodeHex(val));
    }
  });
}
function arrayStrings(index, callback) {
  g_contract.arrayStrings(index, callback);
}
function arrayBytes(index, callback) {
  g_contract.arrayBytes(index, function(error, val) {
    if (error) {
      callback(error);
    } else {
      callback(error, decodeHex(val));
    }
  });
}
function iterableMapping(hash, callback) {
  g_contract.iterableMapping(hash, callback);
}
function getIterableMapping(index, callback) {
  g_contract.getIterableMapping(index, callback);
}
function addressArray(hash, callback) {
  g_contract.addressArray(hash, callback);
}
function getAddressArray(index, callback) {
  g_contract.getAddressArray(index, callback);
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
function iterableMappingLength(callback) {
  g_contract.iterableMappingLength(callback);
}
function addressArrayLength(callback) {
  g_contract.addressArrayLength(callback);
}

function incr(callback) {
  const data = g_contract.incr.getData();
  personalSendTransaction(data, function(error, result) {
    if (error) {
      callback(error);
    } else {
      _waitForTx(result, function(error){
        callback(error);
      });
    }
  });
}
function incrLength(callback) {
  g_contract.incrLength(callback);
}

function _waitForEvent(txhash, callback) {
  if (0 == g_createDocumentCallbacksCount) {
    g_documentEvent = g_contract.DocumentEvent(null, null, function(error, result) {
      if (error) {
        console.log(error);
      } else {
        let _callback = g_createDocumentCallbacks[result.transactionHash];
        if (_callback) {
          clearTimeout(g_createDocumentCallbackTimeouts[result.transactionHash]);
          delete g_createDocumentCallbacks[result.transactionHash];
          g_createDocumentCallbacksCount--;
          if (0 == g_createDocumentCallbacksCount) {
            g_documentEvent.stopWatching();
          }
          _callback(undefined, result.args['docId']);
        }
      }
    });
  }
  if (!g_createDocumentCallbacks[txhash]) {
    g_createDocumentCallbacksCount++;
    g_createDocumentCallbacks[txhash] = callback;
    g_createDocumentCallbackTimeouts[txhash] = setTimeout(function(){
      let _callback = g_createDocumentCallbacks[txhash];
      if (_callback) {
        delete g_createDocumentCallbacks[txhash];
        g_createDocumentCallbacksCount--;
        if (0 == g_createDocumentCallbacksCount) {
          g_documentEvent.stopWatching();
        }
        _callback(new Error('Event Timeout;txhash:'+txhash));
      }
    }, TIMEOUT)
  }
}
function _waitForTx(txhash, callback) {
  g_transactionCallbacks[txhash] = callback;
  g_transactionCallbackTimeouts[txhash] = setTimeout(function(){
    var _callback = g_transactionCallbacks[txhash];
    if(_callback){
      delete g_transactionCallbacks[txhash];
      _callback(new Error("Transaction Timeout. txhash:" + txhash));
    }
  }, TIMEOUT);
  const filter = g_web3.eth.filter('latest');
  filter.watch(function(error, result) {
    if (error) {
      filter.stopWatching();
      clearTimeout(g_transactionCallbackTimeouts[txhash]);
      var _callback = g_transactionCallbacks[txhash];
      if(_callback){
        delete g_transactionCallbacks[txhash];
        _callback(error);
      }
    } else {
      g_web3.eth.getTransactionReceipt(txhash, function(error, result){
        if (error) {
          filter.stopWatching();
          clearTimeout(g_transactionCallbackTimeouts[txhash]);
          var _callback = g_transactionCallbacks[txhash];
          if(_callback){
            delete g_transactionCallbacks[txhash];
            _callback(error);
          }
        } else {
          if (result && result.transactionHash == txhash) {
            filter.stopWatching();
            clearTimeout(g_transactionCallbackTimeouts[txhash]);
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
module.exports.getWeb3 = getWeb3;

module.exports.mapStringsAdd = mapStringsAdd;
module.exports.mapBytesAdd = mapBytesAdd;
module.exports.arrayStringsAdd = arrayStringsAdd;
module.exports.arrayBytesAdd = arrayBytesAdd;
module.exports.iterableMappingAdd = iterableMappingAdd;
module.exports.addressArrayAdd = addressArrayAdd;

module.exports.mapStrings = mapStrings;
module.exports.mapBytes = mapBytes;
module.exports.arrayStrings = arrayStrings;
module.exports.arrayBytes = arrayBytes;
module.exports.iterableMapping = iterableMapping;
module.exports.getIterableMapping = getIterableMapping;
module.exports.addressArray = addressArray;
module.exports.getAddressArray = getAddressArray;

module.exports.mapStringsLength = mapStringsLength;
module.exports.mapBytesLength = mapBytesLength;
module.exports.arrayStringsLength = arrayStringsLength;
module.exports.arrayBytesLength = arrayBytesLength;
module.exports.iterableMappingLength = iterableMappingLength;
module.exports.addressArrayLength = addressArrayLength;

module.exports.incr = incr;
module.exports.incrLength = incrLength;