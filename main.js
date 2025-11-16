#!/usr/bin/env node

import readline from "readline";
import fs from "fs";
import path from "path";
import chalk from "chalk";
import { mainCreate } from "./create.js";
import { mainRecover } from "./recover.js";

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

const WALLETS_DIR = path.resolve(process.cwd(), "wallets");
if (!fs.existsSync(WALLETS_DIR)) fs.mkdirSync(WALLETS_DIR, { recursive: true });

// === HÀM HỎI (không in 2 lần) ===
const ask = (question) => {
  return new Promise((resolve) => {
    rl.question(chalk.bold(question), (answer) => {
      resolve(answer.trim());
    });
  });
};

// === MENU CHÍNH ===
async function main() {
  console.clear();
  console.log("=".repeat(70));
  console.log(chalk.bold.cyan("       MULTI-CHAIN WALLET TOOL"));
  console.log(chalk.gray("  Tool được phát triển bởi nhóm tele Airdrop Hunter Siêu Tốc"));
  console.log(chalk.gray("  https://t.me/airdrophuntersieutoc"));
  console.log("=".repeat(70));

  while (true) {
    console.log(chalk.cyan("\nChọn hành động:"));
    console.log("  1. Tạo ví mới");
    console.log("  2. Khôi phục ví từ mnemonic (Excel)");
    console.log("  3. Thoát\n");

    const action = await ask("Nhập (1-3): ");

    if (action === "3") {
      console.log(chalk.magenta("\nTạm biệt!\n"));
      rl.close();
      return;
    }

    if (action === "1") {
      await mainCreate(rl);
    } else if (action === "2") {
      await mainRecover(rl);
    } else {
      console.log(chalk.red("Vui lòng nhập 1, 2 hoặc 3!\n"));
      await new Promise((r) => setTimeout(r, 1200));
      continue;
    }

    const again = await ask("\nTiếp tục sử dụng tool? (y/n): ");
    if (again.toLowerCase() !== "y") {
      console.log(chalk.magenta("\nCảm ơn bạn đã sử dụng tool!\n"));
      rl.close();
      return;
    }
    console.clear();
  }
}

main().catch((err) => {
  console.error(chalk.red("\nLỗi:", err.message));
  rl.close();
  process.exit(1);
});
