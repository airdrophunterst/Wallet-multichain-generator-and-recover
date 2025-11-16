// src/evm-wallet.js
import { ethers } from 'ethers';
import { mnemonicToEntropy } from 'bip39';
import { derivePath } from 'ed25519-hd-key';

export function createEvmWallet(mnemonic, index = 0, chain = 'ETH') {
  const seed = mnemonicToEntropy(mnemonic);
  const hdNode = ethers.HDNodeWallet.fromSeed(`0x${seed}`);
  const derivationPath = `m/44'/60'/0'/0/${index}`;
  const wallet = hdNode.derivePath(derivationPath);

  return {
    address: wallet.address,
    privateKey: wallet.privateKey,
    type: chain,
    mnemonic,
    path: derivationPath,
  };
}