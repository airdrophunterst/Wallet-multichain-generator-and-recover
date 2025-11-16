#!/usr/bin/env node

import ExcelJS from "exceljs";
import fs from "fs";
import path from "path";
import { HDNodeWallet, Mnemonic } from "ethers";
import { Keypair } from "@solana/web3.js";
import { Ed25519Keypair } from "@mysten/sui/keypairs/ed25519";
import { AptosAccount } from "aptos";
import chalk from "chalk";

const WALLETS_DIR = path.resolve(process.cwd(), "wallets");

// === CẤU HÌNH CHAIN ===
const CHAINS = [
  {
    id: 1,
    name: "EVM",
    file: "EVM_wallets.xlsx",
    hd: true,
    derive: (mnemonic, index) => {
      const path = `m/44'/60'/0'/0/${index}`;
      const wallet = HDNodeWallet.fromMnemonic(Mnemonic.fromPhrase(mnemonic), path);
      return { address: wallet.address, privateKey: wallet.privateKey, path };
    },
  },
  //   {
  //     id: 2,
  //     name: "SOL",
  //     file: "SOL_wallets.xlsx",
  //     hd: true,
  //     derive: async (mnemonic, index) => {
  //       const seed = await crypto.subtle.importKey("raw", new TextEncoder().encode("mnemonic"), { name: "PBKDF2" }, false, ["deriveBits"]);
  //       const derived = await crypto.subtle.deriveBits(
  //         {
  //           name: "PBKDF2",
  //           salt: new TextEncoder().encode("mnemonic"),
  //           iterations: 2048,
  //           hash: "SHA-512",
  //         },
  //         seed,
  //         256
  //       );
  //       const seed32 = new Uint8Array(derived).slice(0, 32);
  //       const keypair = Keypair.fromSeed(seed32);
  //       const path = `m/44'/501'/${index}'/0'`;
  //       return {
  //         address: keypair.publicKey.toBase58(),
  //         privateKey: Buffer.from(keypair.secretKey).toString("hex"),
  //         path,
  //       };
  //     },
  //   },
  //   {
  //     id: 3,
  //     name: "SUI",
  //     file: "SUI_wallets.xlsx",
  //     hd: false,
  //     derive: (mnemonic) => {
  //       const keypair = Ed25519Keypair.deriveKeypair(mnemonic);
  //       return {
  //         address: keypair.getPublicKey().toSuiAddress(),
  //         privateKey: Buffer.from(keypair.export().privateKey).toString("hex"),
  //         path: "N/A",
  //       };
  //     },
  //   },
  //   {
  //     id: 4,
  //     name: "APT",
  //     file: "APT_wallets.xlsx",
  //     hd: true,
  //     derive: (mnemonic, index) => {
  //       const path = `m/44'/637'/${index}'/0'/0'`;
  //       const account = AptosAccount.fromDerivePath(path, mnemonic);
  //       return {
  //         address: account.address().hex(),
  //         privateKey: account.signingKey.secretKey.toString("hex").slice(0, 64),
  //         path,
  //       };
  //     },
  //   },
];

// === KHÔI PHỤC MỘT CHAIN ===
async function recoverChain(chain) {
  const filePath = path.join(WALLETS_DIR, chain.file);
  if (!fs.existsSync(filePath)) {
    console.log(chalk.red(`Không tìm thấy file: ${chain.file}`));
    return false;
  }

  console.log(chalk.cyan(`\nĐang xử lý: ${chain.name} → ${chain.file}`));
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.readFile(filePath);
  const ws = workbook.getWorksheet("Wallets");
  if (!ws) {
    console.log(chalk.red("Không tìm thấy sheet 'Wallets'"));
    return false;
  }

  const rows = ws.getRows(2, ws.rowCount - 1);
  let updated = 0,
    skipped = 0;

  for (const row of rows) {
    const index = row.getCell(1).value;
    const mnemonic = row.getCell(4).value?.toString().trim();

    if (!mnemonic) {
      row.getCell(8).value = "missing mnemonic";
      skipped++;
      continue;
    }

    try {
      let result;
      if (chain.name === "SOL") {
        result = await chain.derive(mnemonic, index - 1);
      } else if (chain.hd) {
        result = chain.derive(mnemonic, index - 1);
      } else {
        result = chain.derive(mnemonic);
      }

      row.getCell(2).value = result.address;
      row.getCell(3).value = result.privateKey;
      row.getCell(5).value = result.path;
      row.getCell(8).value = "ready";
      row.getCell(9).value = chain.hd ? "HD wallet" : "1 ví/mnemonic";

      updated++;
      console.log(chalk.green(`[OK] #${index} → ${result.address.slice(0, 10)}...`));
    } catch (err) {
      row.getCell(8).value = "invalid mnemonic";
      skipped++;
      console.log(chalk.yellow(`[SKIP] #${index} → ${mnemonic.slice(0, 25)}...`));
    }
  }

  await workbook.xlsx.writeFile(filePath);
  console.log(chalk.blue(`\nHoàn tất ${chain.name}:`));
  console.log(chalk.green(`Cập nhật: ${updated}`), chalk.yellow(`Bỏ qua: ${skipped}`));
  return true;
}

// === MAIN RECOVER – NHẬN `rl` TỪ BÊN NGOÀI ===
export async function mainRecover(rl) {
  const ask = (q) => new Promise((r) => rl.question(chalk.bold(q), r));

  while (true) {
    console.log("=".repeat(60));
    console.log(chalk.cyan("     KHÔI PHỤC VÍ TỪ MNEMONIC (EXCEL)"));
    console.log("=".repeat(60));
    console.log(chalk.gray("Cập nhật address, privateKey, path từ mnemonic\n"));

    console.log(chalk.cyan("Chọn chain để khôi phục:"));
    CHAINS.forEach((c) => console.log(`  ${c.id}. ${c.name}`));
    console.log("  0. Quay lại menu chính\n");

    const choice = await ask("Nhập (0-4): ");
    if (choice === "0") return;

    const id = parseInt(choice);
    const chain = CHAINS.find((c) => c.id === id);
    if (!chain) {
      console.log(chalk.red("ID không hợp lệ!\n"));
      await new Promise((r) => setTimeout(r, 1000));
      continue;
    }

    await recoverChain(chain);

    const again = await ask("\nTiếp tục với chain khác? (y/n): ");
    if (again.toLowerCase() !== "y") {
      return;
    }
  }
}
