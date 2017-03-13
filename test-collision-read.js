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
  default:
    funcName = 'arrayBytes';
    isByte = true;
    break;
}
console.log('funcName:' + funcName);

Contract.setServer(serverUrl);
Contract.setAccount(account, accountPassphrase);

const rl = readline.createInterface({
                                      input: fs.createReadStream(outputFile)
                                    });
let allCount = 0;
let countError = 0;
let countOk = 0;
rl.on('line', (line) => {
  let elems = line.split(',');
  allCount++;
  Contract[funcName](parseInt(elems[0].substring('docId:'.length)), function(error, result) {
    if (error) {
      console.log(error);
      process.exit();
    } else {
      let expect = elems[2];
      expect = expect.substring(1, expect.length - 2);
      let val = isByte ? new Buffer(JSON.parse(Contract.getWeb3().toAscii(result))).toString() : result;
      let res;
      if (val.startsWith(expect)) {
        res = 'OK';
        countOk++;
      } else {
        res = 'ERROR';
        countError++;
      }
      console.log(res + ' expect:' + expect + ';get:' + val.substring(0, expect.length));
      if(countError + countOk >= allCount){
        console.log('countOk:' + countOk);
        console.log('countError:' + countError);
      }
    }
  });
});
