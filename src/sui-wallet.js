// src/sui-wallet.js
import { Ed25519Keypair } from "@mysten/sui/keypairs/ed25519";
import { encodeSuiPrivateKey } from "@mysten/sui/cryptography";
import { mnemonicToEntropy } from "bip39";
import { sha256 } from "@noble/hashes/sha256";

// Clamp seed cho Ed25519
function clampSeed(seed) {
  const h = sha256(seed); // Uint8Array
  h[0] &= 248;
  h[31] &= 127;
  h[31] |= 64;
  return h;
}

export function createSuiWallet(mnemonic) {
  const entropy = mnemonicToEntropy(mnemonic);
  const entropyBytes = Uint8Array.from(Buffer.from(entropy, "hex"));
  const seed = sha256(entropyBytes);
  const clamped = clampSeed(seed);

  const keypair = Ed25519Keypair.fromSecretKey(clamped);
  const address = keypair.getPublicKey().toSuiAddress();
  const privateKey = encodeSuiPrivateKey(clamped);

  return { address, privateKey, type: "SUI", mnemonic };
}
