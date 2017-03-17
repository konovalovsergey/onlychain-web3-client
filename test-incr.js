'use strict';

const cluster = require('cluster');
const fs = require('fs');
const os = require('os');
const Contract = require('./index-collision');

if (process.argv.length >= 9) {
  const threadsCount = parseInt(process.argv[2]);
  let filesCount = parseInt(process.argv[3]);
  let serverParams = [];
  for (let i = 4; i + 2 < process.argv.length; i += 3) {
    serverParams.push([process.argv[i], process.argv[i + 1], process.argv[i + 2]]);
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

    incr(filesCount, function(error){
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

function incr(filesCount, callback) {
  if (filesCount > 0) {
    let start = Date.now();
    console.log('start incr');
    Contract.incr(function(error){
      console.log('end incr:' + (Date.now() - start) + 'ms');
      if(error){
        callback(error);
      } else {
        incr(filesCount - 1, callback);
      }
    });
  } else {
    callback();
  }
}

function uint8ToArray(val) {
  return Array.from ? Array.from(val) : Array.prototype.slice.call(val)
}

