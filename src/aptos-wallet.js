// src/aptos-wallet.js
import { AptosAccount } from "aptos";
import { mnemonicToEntropy } from "bip39";
import { derivePath } from "ed25519-hd-key";

export function createAptosWallet(mnemonic, index = 0) {
  const seed = mnemonicToEntropy(mnemonic);
  const derived = derivePath(`m/44'/637'/${index}'/0'/0'`, seed);
  const account = new AptosAccount(derived.key);

  return {
    address: account.address().hex(),
    privateKey: `0x${Buffer.from(account.signingKey.secretKey).toString("hex")}`,
    type: "APT",
    mnemonic,
    path: `m/44'/637'/${index}'/0'/0'`,
  };
}
