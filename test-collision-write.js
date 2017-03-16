'use strict';

const cluster = require('cluster');
const fs = require('fs');
const os = require('os');
const Contract = require('./index-collision');

if (process.argv.length >= 9) {
  const outputFile = process.argv[2];
  const account = process.argv[3];
  const accountPassphrase = process.argv[4];
  const type = parseInt(process.argv[5]);
  const threadsCount = parseInt(process.argv[6]);
  const filesCount = parseInt(process.argv[7]);
  const fileSize = parseInt(process.argv[8]);
  let serverUrls = [];
  for (let i = 9; i < process.argv.length; ++i) {
    serverUrls.push(process.argv[i]);
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
    default:
      funcName = 'iterableMapping';
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
    console.log('serverUrls:' + JSON.stringify(serverUrls));
    console.log('process.argv:' + JSON.stringify(process.argv));
    console.log('funcName:' + funcName);
    console.log('isByte:' + isByte);
    console.log('isIterable:' + isIterable);
  } else {
    const serverIndex = cluster.worker.id % serverUrls.length;
    const serverUrl = serverUrls[serverIndex];
    console.log('cluster.worker.id:' + cluster.worker.id + ";index:" + serverIndex + ";url:" + serverUrl);

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
    var data = isByte ? uint8ToArray(new Buffer(valRepeat)) : valRepeat;
    let start = Date.now();
    console.log('start add');
    Contract[funcName + "Add"](data, function(error, result, txhash) {
      if (error) {
        callback(error);
      } else {
        var docId = isIterable ? '0x'+result.toString(16) : result.toString();
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
