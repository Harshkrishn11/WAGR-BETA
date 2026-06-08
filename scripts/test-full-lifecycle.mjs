/**
 * WAGR Smart Contract — Full Lifecycle Test
 * ==========================================
 * Tests: Create Market → Place Bets → Resolve → Finalize → Claim Winnings
 *
 * Prerequisites:
 *   1. Set DEPLOYER_PRIVATE_KEY in .env.local (the owner wallet)
 *   2. Optionally set TEST_BETTOR_PRIVATE_KEY for a second wallet
 *      (if not set, both bets come from the deployer)
 *   3. Both wallets need Base Sepolia ETH for gas
 *   4. Both wallets need USDC on Base Sepolia
 *      (faucet: https://faucet.circle.com/)
 *
 * Run:
 *   node scripts/test-full-lifecycle.mjs
 */

import { ethers } from "ethers";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import dotenv from "dotenv";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, "../.env.local") });

// ─── Config ──────────────────────────────────────────────────────
const RPC_URL = process.env.NEXT_PUBLIC_ALCHEMY_RPC_URL || "https://sepolia.base.org";
const PREDICTION_MARKET = process.env.NEXT_PUBLIC_PREDICTION_MARKET_ADDRESS;
const USDC_ADDR = process.env.NEXT_PUBLIC_USDC_ADDRESS;
const DEPLOYER_KEY = process.env.DEPLOYER_PRIVATE_KEY;
const BETTOR_KEY = process.env.TEST_BETTOR_PRIVATE_KEY;

if (!DEPLOYER_KEY || DEPLOYER_KEY === "YOUR_DEPLOYER_PRIVATE_KEY_HERE") {
  console.error("❌ Please set DEPLOYER_PRIVATE_KEY in .env.local");
  process.exit(1);
}

// ─── ABI (minimal) ──────────────────────────────────────────────
const PM_ABI = JSON.parse(
  fs.readFileSync(path.resolve(__dirname, "../src/lib/WagrPredictionMarket.json"), "utf-8")
);

const ERC20_ABI = [
  "function approve(address spender, uint256 amount) external returns (bool)",
  "function balanceOf(address account) external view returns (uint256)",
  "function allowance(address owner, address spender) external view returns (uint256)",
];

// ─── Setup ──────────────────────────────────────────────────────
const provider = new ethers.JsonRpcProvider(RPC_URL);
const deployer = new ethers.Wallet(DEPLOYER_KEY, provider);
const bettor = BETTOR_KEY ? new ethers.Wallet(BETTOR_KEY, provider) : deployer;

const pm = new ethers.Contract(PREDICTION_MARKET, PM_ABI, deployer);
const usdc = new ethers.Contract(USDC_ADDR, ERC20_ABI, deployer);
const usdcBettor = usdc.connect(bettor);
const pmBettor = pm.connect(bettor);

const USDC_DECIMALS = 6;
const toUSDC = (n) => ethers.parseUnits(String(n), USDC_DECIMALS);
const fromUSDC = (n) => ethers.formatUnits(n, USDC_DECIMALS);

function log(emoji, msg) {
  console.log(`${emoji}  ${msg}`);
}

function divider(title) {
  console.log(`\n${"═".repeat(60)}`);
  console.log(`  ${title}`);
  console.log(`${"═".repeat(60)}\n`);
}

// ─── Main Test ──────────────────────────────────────────────────
async function main() {
  divider("WAGR SMART CONTRACT — FULL LIFECYCLE TEST");

  // ── 0. Pre-flight checks ──
  log("🔍", `Deployer:  ${deployer.address}`);
  log("🔍", `Bettor:    ${bettor.address}`);
  log("🔍", `Contract:  ${PREDICTION_MARKET}`);
  log("🔍", `USDC:      ${USDC_ADDR}`);
  log("🔍", `RPC:       ${RPC_URL}`);

  const owner = await pm.owner();
  log("🔑", `Contract Owner: ${owner}`);
  if (owner.toLowerCase() !== deployer.address.toLowerCase()) {
    console.error("❌ Deployer is NOT the contract owner! Cannot resolve markets.");
    process.exit(1);
  }
  log("✅", "Deployer IS the contract owner");

  const deployerBal = await usdc.balanceOf(deployer.address);
  const bettorBal = await usdc.balanceOf(bettor.address);
  log("💰", `Deployer USDC balance: $${fromUSDC(deployerBal)}`);
  log("💰", `Bettor USDC balance:   $${fromUSDC(bettorBal)}`);

  const SEED_AMOUNT = toUSDC(5);   // $5 seed
  const BET_AMOUNT = toUSDC(5);    // $5 bet from bettor

  if (deployerBal < SEED_AMOUNT) {
    console.error("❌ Deployer doesn't have enough USDC. Need at least $5.");
    process.exit(1);
  }

  const treasuryAddr = await pm.treasuryAddress();
  const treasuryBalBefore = await usdc.balanceOf(treasuryAddr);
  log("🏦", `Treasury: ${treasuryAddr} — Balance: $${fromUSDC(treasuryBalBefore)}`);

  const nextIdBefore = await pm.nextMarketId();
  log("📊", `Current nextMarketId: ${nextIdBefore}`);

  // ── 1. Create Market ──
  divider("STEP 1: CREATE MARKET");

  // Use a very short deadline for testing: 10 seconds from now
  // But the contract may have a MIN duration. Let's try 1 day to be safe, 
  // and then we'll use admin resolve (creatorResolveMarket or resolveMarket).
  // Actually, the owner can resolveMarket even before deadline via `resolveMarket`.
  // Let's check if the contract allows that by looking at the ABI...
  // The resolveMarket might require deadline to have passed. Let's set a short deadline.
  const deadline = Math.floor(Date.now() / 1000) + 60; // 60 seconds from now

  log("📝", "Approving USDC for seed deposit...");
  const approveTx = await usdc.approve(PREDICTION_MARKET, SEED_AMOUNT);
  await approveTx.wait();
  log("✅", `Approved $${fromUSDC(SEED_AMOUNT)} USDC — tx: ${approveTx.hash}`);

  log("📝", "Creating market...");
  let createTx;
  try {
    createTx = await pm.createMarket(
      "Will this test pass successfully?", // question
      "Tech",                               // category
      ["YES", "NO"],                        // options
      BigInt(deadline),                     // deadline
      0,                                    // seedOption (YES)
      SEED_AMOUNT                           // seedAmount
    );
    await createTx.wait();
  } catch (err) {
    // If 60s deadline is too short, try 1 day
    log("⚠️", `Short deadline failed: ${err.reason || err.message}. Trying 1 day...`);
    const longerDeadline = Math.floor(Date.now() / 1000) + 86400;
    createTx = await pm.createMarket(
      "Will this test pass successfully?",
      "Tech",
      ["YES", "NO"],
      BigInt(longerDeadline),
      0,
      SEED_AMOUNT
    );
    await createTx.wait();
  }

  const newMarketId = Number(await pm.nextMarketId()) - 1;
  log("✅", `Market #${newMarketId} created — tx: ${createTx.hash}`);

  // Read market data
  const market = await pm.getMarket(BigInt(newMarketId));
  log("📊", `Question:  ${market.question}`);
  log("📊", `Category:  ${market.category}`);
  log("📊", `Status:    ${market.status} (0=Active)`);
  log("📊", `Pool:      $${fromUSDC(market.totalPool)}`);
  log("📊", `Deadline:  ${new Date(Number(market.deadline) * 1000).toISOString()}`);

  // Check option pools
  const yesPool1 = await pm.getOptionPool(BigInt(newMarketId), 0);
  const noPool1 = await pm.getOptionPool(BigInt(newMarketId), 1);
  log("📊", `YES pool:  $${fromUSDC(yesPool1)}`);
  log("📊", `NO pool:   $${fromUSDC(noPool1)}`);

  // ── 2. Place Bet (Bettor bets NO) ──
  divider("STEP 2: PLACE BET");

  if (bettorBal >= BET_AMOUNT) {
    log("📝", `Bettor approving $${fromUSDC(BET_AMOUNT)} USDC...`);
    const approveBetTx = await usdcBettor.approve(PREDICTION_MARKET, BET_AMOUNT);
    await approveBetTx.wait();
    log("✅", `Approved — tx: ${approveBetTx.hash}`);

    log("📝", "Bettor placing bet on NO...");
    const betTx = await pmBettor.placeBet(BigInt(newMarketId), 1, BET_AMOUNT);
    await betTx.wait();
    log("✅", `Bet placed — tx: ${betTx.hash}`);

    const yesPool2 = await pm.getOptionPool(BigInt(newMarketId), 0);
    const noPool2 = await pm.getOptionPool(BigInt(newMarketId), 1);
    log("📊", `YES pool:  $${fromUSDC(yesPool2)}`);
    log("📊", `NO pool:   $${fromUSDC(noPool2)}`);
  } else {
    log("⚠️", "Bettor has insufficient USDC, skipping bet placement.");
    log("⚠️", "Only the creator's seed is in the pool.");
  }

  // ── 3. Wait for deadline (or skip if admin can resolve early) ──
  divider("STEP 3: RESOLVE MARKET");

  // Wait for deadline to pass
  const now = Math.floor(Date.now() / 1000);
  const dl = Number(market.deadline);
  if (dl > now) {
    const waitSec = dl - now + 5; // extra 5s buffer
    if (waitSec <= 120) {
      log("⏳", `Waiting ${waitSec}s for deadline to pass...`);
      await new Promise((r) => setTimeout(r, waitSec * 1000));
    } else {
      log("⏳", `Deadline is ${waitSec}s away. Trying to resolve anyway (admin might bypass)...`);
    }
  }

  log("📝", "Resolving market → YES (option 0) wins...");
  try {
    const resolveTx = await pm.resolveMarket(BigInt(newMarketId), 0);
    await resolveTx.wait();
    log("✅", `Market resolved — tx: ${resolveTx.hash}`);
  } catch (err) {
    // If resolveMarket requires deadline, try creatorResolveMarket
    log("⚠️", `resolveMarket failed: ${err.reason || err.message}`);
    log("📝", "Trying creatorResolveMarket...");
    try {
      const crTx = await pm.creatorResolveMarket(BigInt(newMarketId), 0);
      await crTx.wait();
      log("✅", `Creator resolved — tx: ${crTx.hash}`);
    } catch (err2) {
      console.error("❌ Both resolve methods failed:", err2.reason || err2.message);
      process.exit(1);
    }
  }

  // Read status after resolve
  const marketAfterResolve = await pm.getMarket(BigInt(newMarketId));
  log("📊", `Status after resolve: ${marketAfterResolve.status} (1=Resolved/Dispute)`);
  log("📊", `Correct option:       ${marketAfterResolve.correctOptionIndex}`);
  log("📊", `Creator Fee:          $${fromUSDC(marketAfterResolve.creatorFee)}`);
  log("📊", `Platform Fee:         $${fromUSDC(marketAfterResolve.platformFee)}`);

  // ── 4. Finalize (move to Claimable) ──
  divider("STEP 4: FINALIZE RESOLUTION");

  log("📝", "Finalizing resolution (making claims available)...");
  try {
    const finalizeTx = await pm.finalizeResolution(BigInt(newMarketId));
    await finalizeTx.wait();
    log("✅", `Finalized — tx: ${finalizeTx.hash}`);
  } catch (err) {
    // Might need to wait for dispute window (24h)
    log("⚠️", `Finalize failed: ${err.reason || err.message}`);
    log("⏳", "Dispute window might not have passed. Checking...");
    
    try {
      const disputeEnd = await pm.getDisputeWindowEnd(BigInt(newMarketId));
      const remaining = Number(disputeEnd) - Math.floor(Date.now() / 1000);
      if (remaining > 0 && remaining <= 120) {
        log("⏳", `Waiting ${remaining + 5}s for dispute window...`);
        await new Promise((r) => setTimeout(r, (remaining + 5) * 1000));
        const finalizeTx2 = await pm.finalizeResolution(BigInt(newMarketId));
        await finalizeTx2.wait();
        log("✅", `Finalized after dispute window — tx: ${finalizeTx2.hash}`);
      } else {
        log("❌", `Dispute window ends in ${remaining}s — too long to wait.`);
        log("💡", "You can finalize later via the Admin panel.");
      }
    } catch (e2) {
      log("❌", `Could not finalize: ${e2.reason || e2.message}`);
    }
  }

  const marketFinal = await pm.getMarket(BigInt(newMarketId));
  log("📊", `Final status: ${marketFinal.status} (2=Claimable)`);

  // ── 5. Claim Winnings ──
  divider("STEP 5: CLAIM WINNINGS");

  if (Number(marketFinal.status) === 2) {
    // Deployer bet YES (seed), and we resolved YES → deployer should be able to claim
    const deployerBalBefore = await usdc.balanceOf(deployer.address);
    log("💰", `Deployer USDC before claim: $${fromUSDC(deployerBalBefore)}`);

    log("📝", "Deployer claiming winnings...");
    try {
      const claimTx = await pm.claimWinnings(BigInt(newMarketId));
      await claimTx.wait();
      log("✅", `Claimed — tx: ${claimTx.hash}`);
    } catch (err) {
      log("⚠️", `Claim failed: ${err.reason || err.message}`);
    }

    const deployerBalAfter = await usdc.balanceOf(deployer.address);
    log("💰", `Deployer USDC after claim:  $${fromUSDC(deployerBalAfter)}`);
    const profit = deployerBalAfter - deployerBalBefore;
    log("📈", `Deployer received: $${fromUSDC(profit)}`);

    // Check treasury balance change
    const treasuryBalAfter = await usdc.balanceOf(treasuryAddr);
    const treasuryIncrease = treasuryBalAfter - treasuryBalBefore;
    log("🏦", `Treasury balance after:   $${fromUSDC(treasuryBalAfter)}`);
    log("🏦", `Treasury increase:        $${fromUSDC(treasuryIncrease)}`);

    // Verify hasClaimed
    const hasClaimed = await pm.hasClaimed(BigInt(newMarketId), deployer.address);
    log("📊", `Deployer hasClaimed: ${hasClaimed}`);

    // Try double claim (should fail)
    log("📝", "Testing double-claim protection...");
    try {
      await pm.claimWinnings(BigInt(newMarketId));
      log("❌", "DOUBLE CLAIM SUCCEEDED — THIS IS A BUG!");
    } catch {
      log("✅", "Double claim correctly reverted ✓");
    }
  } else {
    log("⚠️", "Market not in Claimable state, skipping claim test.");
    log("💡", "Finalize the resolution via Admin panel, then run this script section again.");
  }

  // ── Summary ──
  divider("TEST SUMMARY");

  const finalMarket = await pm.getMarket(BigInt(newMarketId));
  console.log({
    marketId: newMarketId,
    question: finalMarket.question,
    status: Number(finalMarket.status),
    statusLabel: ["Active", "Resolved (Dispute)", "Claimable", "Invalidated"][Number(finalMarket.status)],
    totalPool: `$${fromUSDC(finalMarket.totalPool)}`,
    correctOption: Number(finalMarket.correctOptionIndex) === 0 ? "YES" : "NO",
    creatorFee: `$${fromUSDC(finalMarket.creatorFee)}`,
    platformFee: `$${fromUSDC(finalMarket.platformFee)}`,
  });

  log("🎉", "Full lifecycle test complete!");
}

main().catch((err) => {
  console.error("\n❌ TEST FAILED:", err);
  process.exit(1);
});
