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
    findInBlocks(1, blockCount, txhashes);
  }
});
function findInBlocks(blockNumber, blockCount) {
  if (blockNumber <= blockCount) {
    Contract.getWeb3().eth.getBlock(blockNumber, function(error, block) {
      if (error) {
        console.log(error);
      } else {
        console.log('blockNumber:' + blockNumber + ";transactions.length:" + block.transactions.length);
        //console.log('blockNumber:' + blockNumber + ";transactions:" + JSON.stringify(block.transactions));
        for (let i = 0; i < txhashes.length; ++i) {
          const txhash = txhashes[i];
          if (block.transactions.indexOf(txhash) > -1) {
            console.log('txhash:' + txhash + "is transactions in blockInfo " + getBlockInfo(block));
          }
        }
        if (block.uncles.length > 0) {
          console.log('blockNumber:' + blockNumber + ";uncles:" + JSON.stringify(block.uncles));
          findInUncles(0, block.uncles, block, function(error) {
            if (error) {
              console.log(error);
            } else {
              findInBlocks(blockNumber + 1, blockCount);
            }
          });
        } else {
          findInBlocks(blockNumber + 1, blockCount);
        }
      }
    });
  } else {
    console.log('end');
  }
}
function findInUncles(uncleNumber, uncles, parentBlock, callback) {
  if (uncleNumber < uncles.length) {
    Contract.getWeb3().eth.getUncle(parentBlock.number, uncleNumber, function(error, block) {
      if (error) {
        callback(error);
      } else {
        for (let i = 0; i < txhashes.length; ++i) {
          const txhash = txhashes[i];
          if (block.transactions.indexOf(txhash) > -1) {
            console.log('txhash:' + txhash + "is uncle in blockInfo " + getBlockInfo(block) + ';parent blockInfo ' +
                        getBlockInfo(parentBlock));
          }
        }
        findInUncles(uncleNumber + 1, uncles, parentBlock);
      }
    });
  } else {
    console.log('end');
  }
}
function getBlockInfo(block) {
  return 'number:' + block.number + ';hash:' + block.hash + ';miner:' + block.miner + ';timestamp:' + block.timestamp +
    ';transactionCount:' + block.transactions.length + ';unclesCount:' + block.uncles.length;
}