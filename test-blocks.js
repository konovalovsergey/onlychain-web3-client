'use strict';

const fs = require('fs');
const readline = require('readline');
const Contract = require('./index-collision');

const serverUrl = process.argv[2];
let txhashes = [];
for (let i = 3; i < process.argv.length; ++i) {
  txhashes.push(process.argv[i]);
}
console.log('txhashes:' + JSON.stringify(txhashes));
Contract.setServer(serverUrl);

Contract.getWeb3().eth.getBlockNumber(function(error, blockCount) {
  if (error) {
    console.log(error);
  } else {
    console.log('getBlockCount:' + blockCount);
    findInBlocks(blockCount, txhashes);
  }
});
function findInBlocks(blockCount) {
  if (blockCount > 0) {
    Contract.getWeb3().eth.getBlock(blockCount, function(error, block) {
      if (error) {
        console.log(error);
      } else {
        console.log('blockNumber:' + blockCount + ";transactions.length:" + block.transactions.length);
        for (let i = txhashes.length - 1; i >= 0; --i) {
          const txhash = txhashes[i];
          if (block.transactions.indexOf(txhash) > -1) {
            console.log('txhash:' + txhash + "is transactions in blockInfo " + getBlockInfo(block));
            txhashes.splice(i, 1);
          }
          if (0 == txhashes.length) {
            console.log('end');
            process.exit();
          }
        }
        if (block.uncles.length > 0) {
          console.log('blockNumber:' + blockCount + ";uncles:" + JSON.stringify(block.uncles));
          findInUncles(0, block.uncles, block, function(error) {
            if (error) {
              console.log(error);
            } else {
              findInBlocks(blockCount - 1);
            }
          });
        } else {
          findInBlocks(blockCount - 1);
        }
      }
    });
  } else {
    console.log('end');
  }
}
function findInUncles(uncleNumber, uncles, parentBlock, callback) {
  if (uncleNumber < uncles.length) {
    Contract.getWeb3().eth.getBlock(uncles[uncleNumber], function(error, block) {
      if (error) {
        callback(error);
      } else {
        if(block){
          console.log('uncle index:' + uncleNumber + ";blockInfo:" + getBlockInfo(block));
          for (let i = txhashes.length - 1; i >= 0; --i) {
            const txhash = txhashes[i];
            if (block.transactions.indexOf(txhash) > -1) {
              console.log('txhash:' + txhash + "is uncle in blockInfo " + getBlockInfo(block) + ';parent blockInfo ' +
                          getBlockInfo(parentBlock));
            }
          }
          if (0 == txhashes.length) {
            console.log('end');
            process.exit();
          }
        }
        findInUncles(uncleNumber + 1, uncles, parentBlock, callback);
      }
    });
  } else {
    callback();
  }
}
function getBlockInfo(block) {
  return 'number:' + block.number + ';hash:' + block.hash + ';miner:' + block.miner + ';timestamp:' + block.timestamp +
    ';transactionCount:' + block.transactions.length + ';unclesCount:' + block.uncles.length;
}