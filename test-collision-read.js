'use strict';

const fs = require('fs');
const readline = require('readline');
const Contract = require('./index-collision');

const outputFile = process.argv[2];
const account = process.argv[3];
const accountPassphrase = process.argv[4];
const type = parseInt(process.argv[5]);
const serverUrl = process.argv[6];
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
console.log('funcName:' + funcName);

Contract.setServer(serverUrl);
Contract.setAccount(account, accountPassphrase);

const rl = readline.createInterface({
                                      input: fs.createReadStream(outputFile)
                                    });
let errorIds = [];
let countError = 0;
let lines = [];
rl.on('line', (line) => {
  lines.push(line);
}).on('close', () => {
  checkFiles(0);
});

function checkFiles(index){
  if(index < lines.length){
    let elems = lines[index].split(',');
    let docId = Contract.getWeb3().toBigNumber(elems[0].substring('docId:'.length));
    Contract[funcName](docId, function(error, result) {
      let expect = elems[2];
      expect = expect.substring(1, expect.length - 1);
      if (error) {
        console.log(error);
      } else {
        let val = isByte ? new Buffer(JSON.parse(Contract.getWeb3().toAscii(result))).toString() : result;
        if (!val.startsWith(expect)) {
          let res = 'ERROR';
          errorIds.push([docId, expect]);
          console.log(res + ' expect:' + expect + ';get:' + val.substring(0, expect.length));
        }
      }
      checkFiles(index + 1);
    });
  } else {
    console.log('countAll:' + lines.length);
    console.log('countError:' + errorIds.length);
    if(errorIds.length > 0){
      console.log('findErrors');
      Contract[funcName+"Length"](function(error, result) {
        if (error) {
          console.log(error);
          process.exit();
        } else {
          console.log('filesCount:'+result);
          findErrors(0, result);
        }
      });
    } else {
      console.log('end');
      process.exit();
    }
  }
}
function findErrors(index, count){
  if(index < count){
    var funcNameCur = isIterable ? 'getIterableMapping' : funcName;
    Contract[funcNameCur](index, function(error, result) {
      if (error) {
        console.log(error);
      } else {
        let val = isByte ? new Buffer(JSON.parse(Contract.getWeb3().toAscii(result))).toString() : result;
        for(let i = 0; i < errorIds.length; ++i){
          if(val.startsWith(errorIds[i][1])){
            var docId = isIterable ? '0x'+errorIds[i][0].toString(16) : errorIds[i][0].toString();
            console.log('docId:'+docId+'; found at index:' + index);
          }
        }
      }
      findErrors(index + 1, count);
    });
  } else {
    console.log('end');
    process.exit();
  }
}