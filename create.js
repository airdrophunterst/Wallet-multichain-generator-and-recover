#!/usr/bin/env node

import readline from "readline";
import ExcelJS from "exceljs";
import fs from "fs";
import path from "path";
import { generateMnemonic } from "bip39";
import { createSuiWallet } from "./src/sui-wallet.js";
import { createSolWallet } from "./src/sol-wallet.js";
import { createEvmWallet } from "./src/evm-wallet.js";
import { createAptosWallet } from "./src/aptos-wallet.js";
// import { createBitcoinWallet } from "./src/bitcoin-wallet.js";
import chalk from "chalk";

const WALLETS_DIR = path.resolve(process.cwd(), "wallets");
if (!fs.existsSync(WALLETS_DIR)) fs.mkdirSync(WALLETS_DIR, { recursive: true });

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

const WALLET_TYPES = [
  { id: 1, name: "SUI", fn: createSuiWallet, hd: false },
  { id: 2, name: "SOL", fn: createSolWallet, hd: true },
  { id: 3, name: "EVM", fn: (m, i) => createEvmWallet(m, i, "EVM"), hd: true },
  // { id: 4, name: "BSC", fn: (m, i) => createEvmWallet(m, i, "BSC"), hd: true },
  { id: 4, name: "APT", fn: createAptosWallet, hd: true },
  // { id: 6, name: "BTC", fn: createBitcoinWallet, hd: true },
];
async function saveToExcel(wallets, type) {
  const file = path.join(WALLETS_DIR, `${type}_wallets.xlsx`);
  const workbook = new ExcelJS.Workbook();
  let worksheet;
  let startRow = 2; // Dòng bắt đầu thêm dữ liệu (dưới header)
  let existingCount = 0;

  // Kiểm tra file có tồn tại không
  if (fs.existsSync(file)) {
    console.log(`\nĐang đọc file cũ: ${path.basename(file)}...`);
    await workbook.xlsx.readFile(file);
    worksheet = workbook.getWorksheet("Wallets");

    if (!worksheet) {
      // Nếu không có sheet "Wallets" → tạo mới
      worksheet = workbook.addWorksheet("Wallets");
      setupHeaders(worksheet);
    } else {
      // Đếm số dòng hiện có (bỏ qua header)
      existingCount = worksheet.rowCount - 1;
      startRow = worksheet.rowCount + 1;
      console.log(`Đã có ${existingCount} ví trong file.`);
    }
  } else {
    // File chưa tồn tại → tạo mới
    worksheet = workbook.addWorksheet("Wallets");
    setupHeaders(worksheet);
    console.log(`Tạo file mới: ${path.basename(file)}`);
  }

  // Thêm dữ liệu mới
  wallets.forEach((w, i) => {
    const rowIndex = startRow + i;
    worksheet.getRow(rowIndex).values = [
      existingCount + i + 1, // index liên tục
      w.address,
      w.privateKey,
      w.mnemonic,
      w.path || (w.type === "SUI" ? "N/A" : `m/44'/.../${i}`),
      w.type,
      w.network || "mainnet",
      "ready",
      w.type === "SUI" ? "1 ví/mnemonic" : "HD wallet",
    ];
  });

  // Auto filter toàn bộ
  worksheet.autoFilter = `A1:I${worksheet.rowCount}`;

  // Lưu file
  await workbook.xlsx.writeFile(file);
  console.log(`Đã thêm ${wallets.length} ví mới → Tổng: ${existingCount + wallets.length} ví`);
  console.log(`File: ${file}\n`);
}

// Hàm tạo header (tách riêng để tái sử dụng)
function setupHeaders(worksheet) {
  worksheet.columns = [
    { header: "index", key: "index", width: 8 },
    { header: "address", key: "address", width: 50 },
    { header: "privateKey", key: "privateKey", width: 80 },
    { header: "mnemonic", key: "mnemonic", width: 70 },
    { header: "path", key: "path", width: 30 },
    { header: "type", key: "type", width: 10 },
    { header: "network", key: "network", width: 12 },
    { header: "status", key: "status", width: 12 },
    { header: "note", key: "note", width: 40 },
  ];

  const headerRow = worksheet.getRow(1);
  headerRow.font = { bold: true, color: { argb: "FFFFFFFF" } };
  headerRow.fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: "FF1f4e79" },
  };
}

export async function mainCreate(rl) {
  console.clear();
  console.log("=".repeat(70));
  console.log("     MULTI-CHAIN WALLET GENERATOR (SUI, SOL, ETH, BSC, APT, BTC)");
  console.log("=".repeat(70));
  console.log(chalk.yellow("Tool được phát triển bởi nhóm tele Airdrop Hunter Siêu Tốc (https://t.me/airdrophuntersieutoc)"));
  const ask = (q) => new Promise((r) => rl.question(chalk.bold(q), r));
  console.log("\nChọn loại ví:");
  WALLET_TYPES.forEach((t) => console.log(`  ${t.id}. ${t.name}`));
  console.log("  7. Thoát\n");

  const choice = await ask("Nhập (1-7): ");
  const selected = WALLET_TYPES.find((t) => t.id === parseInt(choice));
  if (!selected && choice !== "7") {
    console.log("Không hợp lệ!");
    await sleep(1000);
    return main();
  }
  if (choice === "7") {
    console.log("Tạm biệt!");
    rl.close();
    return;
  }

  const count = parseInt(await ask(`\nSố lượng ví ${selected.name}: `));
  if (isNaN(count) || count <= 0 || count > 1000) {
    console.log("Số lượng không hợp lệ!");
    await sleep(1500);
    return main();
  }

  let mnemonic = null;
  if (selected.hd) {
    const same = await ask(`Dùng chung 1 mnemonic cho ${count} ví? (y/n) | Default: (n): `);
    if (same.toLowerCase() === "y") {
      mnemonic = generateMnemonic(128);
      console.log(`\nMnemonic: ${mnemonic}\n`);
    }
  }

  console.log(`\nTạo ${count} ví ${selected.name}...\n`);
  const wallets = [];

  for (let i = 0; i < count; i++) {
    process.stdout.write(`   [${i + 1}/${count}] `);
    const currentMnemonic = selected.hd && mnemonic ? mnemonic : generateMnemonic(128);
    const wallet = selected.fn(currentMnemonic, i);
    wallets.push(wallet);
    console.log(`${selected.name} | ${wallet.address.slice(0, 12)}...`);
  }

  await saveToExcel(wallets, selected.name);
  console.log(`\nHoàn tất! ${count} ví ${selected.name} đã lưu.\n`);

  const again = await ask("Tạo loại ví khác? (y/n): ");
  if (again.toLowerCase() === "y") {
    return await main().catch((err) => {
      console.error("Lỗi:", err.message);
      process.exit(1);
    });
  } else console.log("Cảm ơn bạn đã sử dụng!\n");
  rl.close();
}
