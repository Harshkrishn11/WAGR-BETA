import { ethers } from "ethers";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import dotenv from "dotenv";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, "../.env.local") });

const RPC_URL = process.env.NEXT_PUBLIC_ALCHEMY_RPC_URL;
const PM_ADDR = process.env.NEXT_PUBLIC_PREDICTION_MARKET_ADDRESS;
const USDC_ADDR = process.env.NEXT_PUBLIC_USDC_ADDRESS;
const KEY = process.env.DEPLOYER_PRIVATE_KEY;

const PM_ABI = JSON.parse(fs.readFileSync(path.resolve(__dirname, "../src/lib/WagrPredictionMarket.json"), "utf-8"));
const ERC20_ABI = [
  "function approve(address spender, uint256 amount) external returns (bool)",
  "function balanceOf(address account) external view returns (uint256)",
  "function allowance(address owner, address spender) external view returns (uint256)",
];

const provider = new ethers.JsonRpcProvider(RPC_URL);
const wallet = new ethers.Wallet(KEY, provider);
const pm = new ethers.Contract(PM_ADDR, PM_ABI, wallet);
const usdc = new ethers.Contract(USDC_ADDR, ERC20_ABI, wallet);

const SEED = ethers.parseUnits("10", 6); // $10
const DEADLINE = Math.floor(Date.now() / 1000) + 86400; // 24 hours

const MARKETS = [
  { question: "Will Bitcoin surpass $115,000 by June 10, 2026?", category: "Crypto", seedSide: 0 },
  { question: "Will Ethereum close above $4,500 on June 9, 2026?", category: "Crypto", seedSide: 0 },
];

async function main() {
  console.log(`Wallet: ${wallet.address}`);
  const bal = await usdc.balanceOf(wallet.address);
  console.log(`USDC Balance: $${ethers.formatUnits(bal, 6)}`);

  if (bal < SEED * 2n) {
    console.error("Not enough USDC! Need at least $20.");
    process.exit(1);
  }

  // Approve enough for both markets
  const totalApproval = SEED * 2n;
  const allowance = await usdc.allowance(wallet.address, PM_ADDR);
  if (allowance < totalApproval) {
    console.log("Approving USDC...");
    const tx = await usdc.approve(PM_ADDR, totalApproval);
    await tx.wait();
    console.log(`✅ Approved $${ethers.formatUnits(totalApproval, 6)}`);
  }

  for (const m of MARKETS) {
    console.log(`\nCreating: "${m.question}"`);
    const tx = await pm.createMarket(
      m.question,
      m.category,
      ["YES", "NO"],
      BigInt(DEADLINE),
      m.seedSide,
      SEED
    );
    const receipt = await tx.wait();
    const newId = Number(await pm.nextMarketId()) - 1;
    console.log(`✅ Market #${newId} created — tx: ${receipt.hash}`);
  }

  console.log("\n🎉 Both markets are live!");
}

main().catch(e => { console.error("❌", e.message); process.exit(1); });
