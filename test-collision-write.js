'use strict';

const cluster = require('cluster');
const fs = require('fs');
const os = require('os');
const Contract = require('./index-collision');

if (process.argv.length >= 9) {
  const outputFile = process.argv[2];
  const type = parseInt(process.argv[3]);
  const threadsCount = parseInt(process.argv[4]);
  const filesCount = parseInt(process.argv[5]);
  const fileSize = parseInt(process.argv[6]);
  let serverParams = [];
  for (let i = 7; i + 2 < process.argv.length; i += 3) {
    serverParams.push([process.argv[i], process.argv[i + 1], process.argv[i + 2]]);
  }
  let funcName;
  let isByte = false;
  let isIterable = false;
  switch (type) {
    case 0:
      funcName = 'mapStrings';
      break;
    case 1:
      funcName = 'mapBytes';
      isByte = true;
      break;
    case 2:
      funcName = 'arrayStrings';
      break;
    case 3:
      funcName = 'arrayBytes';
      isByte = true;
      break;
    case 4:
      funcName = 'iterableMapping';
      isIterable = true;
      break;
    default:
      funcName = 'addressArray';
      isIterable = true;
      break;
  }

  if (cluster.isMaster) {
    for (let i = 0; i < threadsCount; ++i) {
      cluster.fork();
    }
    cluster.on('exit', (worker, code, signal) => {
      console.log('worker %s died (code = %s; signal = %s).', worker.process.pid, code, signal);
    });
    console.log('serverParams:' + JSON.stringify(serverParams));
    console.log('process.argv:' + JSON.stringify(process.argv));
    console.log('funcName:' + funcName);
    console.log('isByte:' + isByte);
    console.log('isIterable:' + isIterable);
  } else {
    const serverIndex = cluster.worker.id % serverParams.length;
    const serverUrl = serverParams[serverIndex][0];
    const account = serverParams[serverIndex][1];
    const accountPassphrase = serverParams[serverIndex][2];
    console.log(
      'cluster.worker.id:' + cluster.worker.id + ";index:" + serverIndex + ";url:" + serverUrl + ";account:" + account +
      ";accountPassphrase:" + accountPassphrase);

    Contract.setServer(serverUrl);
    Contract.setAccount(account, accountPassphrase);

    addElems(funcName, isByte, isIterable, outputFile, 0, filesCount, fileSize, function(error) {
      if (error) {
        console.log(error);
      }
      console.log('end');
      process.exit();
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

function addElems(funcName, isByte, isIterable, outputFile, index, filesCount, fileSize, callback) {
  if (index < filesCount) {
    const val = 'worker:' + cluster.worker.id + ';index:' + index + ';time:' + Date.now();
    const valRepeat = val.repeat(Math.ceil(fileSize / val.length));
    let data = isByte ? uint8ToArray(new Buffer(valRepeat)) : valRepeat;
    let start = Date.now();
    console.log('start add');
    Contract[funcName + "Add"](data, function(error, result, txhash) {
      if (error) {
        callback(error);
      } else {
        let docId = isIterable ? '0x'+result.toString(16) : result.toString();
        let line = 'docId:' + docId + ',worker.id:' + cluster.worker.id + ',"' + val + '",length:' + data.length + ',txhash:'+txhash;
        console.log((Date.now() - start) + 'ms,' + line);
        fs.appendFile(outputFile, line + os.EOL, function(error) {
          if (error) {
            callback(error);
          } else {
            addElems(funcName, isByte, isIterable, outputFile, index + 1, filesCount, fileSize, callback);
          }
        });
      }
    });
  } else {
    callback();
  }
}

function uint8ToArray(val) {
  return Array.from ? Array.from(val) : Array.prototype.slice.call(val)
}
