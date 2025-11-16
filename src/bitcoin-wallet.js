// src/bitcoin-wallet.js
import * as bitcoin from "bitcoinjs-lib";
import { BIP32Factory } from "bitcoinjs-lib/bip32"; // ĐÚNG: import từ subpath
import * as ecc from "tiny-secp256k1";
import { mnemonicToEntropy } from "bip39";

// Tạo BIP32 instance
const bip32 = BIP32Factory(ecc);

export function createBitcoinWallet(mnemonic, index = 0, networkType = "mainnet") {
  const network = networkType === "testnet" ? bitcoin.networks.testnet : bitcoin.networks.bitcoin;

  const seed = Buffer.from(mnemonicToEntropy(mnemonic), "hex");
  const root = bip32.fromSeed(seed, network);
  const path = `m/84'/${networkType === "testnet" ? 1 : 0}'/${index}'/0/0`;
  const child = root.derivePath(path);

  const { address } = bitcoin.payments.p2wpkh({
    pubkey: child.publicKey,
    network,
  });

  if (!address) throw new Error("Failed to generate BTC address");

  return {
    address,
    privateKey: child.toWIF(),
    type: "BTC",
    mnemonic,
    path,
    network: networkType,
  };
}
