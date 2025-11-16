// src/sol-wallet.js
import { Keypair } from "@solana/web3.js";
import { derivePath } from "ed25519-hd-key";
import { mnemonicToEntropy } from "bip39";

export function createSolWallet(mnemonic, index = 0) {
  const seed = mnemonicToEntropy(mnemonic);
  const derivedSeed = derivePath(`m/44'/501'/${index}'/0'`, seed).key;
  const keypair = Keypair.fromSeed(derivedSeed);

  const address = keypair.publicKey.toBase58();
  const privateKey = Buffer.from(keypair.secretKey).toString("base64");

  return { address, privateKey, type: "SOL", mnemonic };
}
