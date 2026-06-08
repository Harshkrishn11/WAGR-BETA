/**
 * WAGR Smart Contract — Read-Only State Checker
 * ================================================
 * Checks all existing markets, pools, fees, and contract state.
 * No private key needed — read-only operations.
 *
 * Run:
 *   node scripts/check-contract-state.mjs
 */

import { ethers } from "ethers";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import dotenv from "dotenv";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, "../.env.local") });

const RPC_URL = process.env.NEXT_PUBLIC_ALCHEMY_RPC_URL || "https://sepolia.base.org";
const PREDICTION_MARKET = process.env.NEXT_PUBLIC_PREDICTION_MARKET_ADDRESS;
const USDC_ADDR = process.env.NEXT_PUBLIC_USDC_ADDRESS;

const PM_ABI = JSON.parse(
  fs.readFileSync(path.resolve(__dirname, "../src/lib/WagrPredictionMarket.json"), "utf-8")
);
const ERC20_ABI = [
  "function balanceOf(address account) external view returns (uint256)",
  "function decimals() external view returns (uint8)",
];

const provider = new ethers.JsonRpcProvider(RPC_URL);
const pm = new ethers.Contract(PREDICTION_MARKET, PM_ABI, provider);
const usdc = new ethers.Contract(USDC_ADDR, ERC20_ABI, provider);

const fromUSDC = (n) => ethers.formatUnits(n, 6);
const STATUS = ["Active", "Resolved (Dispute)", "Claimable", "Invalidated"];

async function main() {
  console.log("═".repeat(60));
  console.log("  WAGR CONTRACT STATE CHECK");
  console.log("═".repeat(60));

  // Contract info
  const owner = await pm.owner();
  const treasury = await pm.treasuryAddress();
  const paused = await pm.paused();
  const minSeed = await pm.minSeedAmount();
  const nextId = await pm.nextMarketId();
  const count = Number(nextId);

  // USDC balances
  const contractBal = await usdc.balanceOf(PREDICTION_MARKET);
  const treasuryBal = await usdc.balanceOf(treasury);

  console.log(`\n📋 Contract Address:   ${PREDICTION_MARKET}`);
  console.log(`🔑 Owner:              ${owner}`);
  console.log(`🏦 Treasury:           ${treasury}`);
  console.log(`⏸️  Paused:             ${paused}`);
  console.log(`💎 Min Seed:           $${fromUSDC(minSeed)}`);
  console.log(`📊 Total Markets:      ${count}`);
  console.log(`💰 Contract USDC Bal:  $${fromUSDC(contractBal)}`);
  console.log(`🏦 Treasury USDC Bal:  $${fromUSDC(treasuryBal)}`);

  // Fee constants
  try {
    const creatorFeeBps = await pm.CREATOR_FEE_BPS();
    const platformFeeBps = await pm.PLATFORM_FEE_BPS();
    const disputeWindow = await pm.DISPUTE_WINDOW();
    const maxDuration = await pm.MAX_DURATION();
    console.log(`\n⚙️  Creator Fee:        ${Number(creatorFeeBps) / 100}%`);
    console.log(`⚙️  Platform Fee:       ${Number(platformFeeBps) / 100}%`);
    console.log(`⚙️  Dispute Window:     ${Number(disputeWindow)}s (${Number(disputeWindow) / 3600}h)`);
    console.log(`⚙️  Max Duration:       ${Number(maxDuration)}s (${Number(maxDuration) / 86400}d)`);
  } catch {
    console.log("  (Could not read fee constants)");
  }

  // Markets
  console.log(`\n${"─".repeat(60)}`);
  console.log("  ALL MARKETS");
  console.log(`${"─".repeat(60)}`);

  let totalLockedUSDC = 0n;
  let activeCount = 0, resolvedCount = 0, claimableCount = 0, invalidCount = 0;

  for (let i = 0; i < count; i++) {
    try {
      const m = await pm.getMarket(BigInt(i));
      const yesPool = await pm.getOptionPool(BigInt(i), 0);
      const noPool = await pm.getOptionPool(BigInt(i), 1);
      const total = yesPool + noPool;
      const yPct = total > 0n ? Number((yesPool * 100n) / total) : 50;
      const statusNum = Number(m.status);

      if (statusNum === 0) { activeCount++; totalLockedUSDC += m.totalPool; }
      if (statusNum === 1) { resolvedCount++; totalLockedUSDC += m.totalPool; }
      if (statusNum === 2) claimableCount++;
      if (statusNum === 3) invalidCount++;

      const deadlineDate = new Date(Number(m.deadline) * 1000);
      const isExpired = deadlineDate < new Date();

      console.log(`\n  Market #${i}`);
      console.log(`  ├─ Question:    ${m.question}`);
      console.log(`  ├─ Category:    ${m.category}`);
      console.log(`  ├─ Status:      ${STATUS[statusNum]} ${statusNum === 0 && isExpired ? "⚠️ NEEDS RESOLUTION" : ""}`);
      console.log(`  ├─ Pool:        $${fromUSDC(m.totalPool)} (YES: $${fromUSDC(yesPool)} [${yPct}%] | NO: $${fromUSDC(noPool)} [${100 - yPct}%])`);
      console.log(`  ├─ Creator:     ${m.creator}`);
      console.log(`  ├─ Seed:        $${fromUSDC(m.creatorSeedAmount)}`);
      console.log(`  ├─ Deadline:    ${deadlineDate.toISOString()} ${isExpired ? "(EXPIRED)" : ""}`);
      if (statusNum >= 1) {
        console.log(`  ├─ Winner:      Option ${m.correctOptionIndex} (${Number(m.correctOptionIndex) === 0 ? "YES" : "NO"})`);
        console.log(`  ├─ Creator Fee: $${fromUSDC(m.creatorFee)}`);
        console.log(`  ├─ Plat Fee:    $${fromUSDC(m.platformFee)}`);
        console.log(`  └─ Resolved By Admin: ${m.resolvedByAdmin}`);
      } else {
        console.log(`  └─ Time Left:   ${isExpired ? "EXPIRED" : `${Math.floor((Number(m.deadline) - Date.now() / 1000) / 3600)}h`}`);
      }
    } catch (err) {
      console.log(`\n  Market #${i}: ❌ Error reading — ${err.message}`);
    }
  }

  // Summary
  console.log(`\n${"═".repeat(60)}`);
  console.log("  SUMMARY");
  console.log(`${"═".repeat(60)}`);
  console.log(`  Active:       ${activeCount}`);
  console.log(`  In Dispute:   ${resolvedCount}`);
  console.log(`  Claimable:    ${claimableCount}`);
  console.log(`  Invalidated:  ${invalidCount}`);
  console.log(`  TVL (locked): $${fromUSDC(totalLockedUSDC)}`);
  console.log(`  Contract Bal: $${fromUSDC(contractBal)}`);
  
  // Sanity check: contract balance should >= TVL
  if (contractBal >= totalLockedUSDC) {
    console.log(`\n  ✅ Contract is SOLVENT (holds enough USDC to cover all pools)`);
  } else {
    console.log(`\n  ❌ WARNING: Contract may be INSOLVENT!`);
    console.log(`     Contract has $${fromUSDC(contractBal)} but pools total $${fromUSDC(totalLockedUSDC)}`);
  }
}

main().catch(console.error);
