/* eslint-disable @typescript-eslint/no-require-imports */
const hre = require("hardhat");
const ethers = hre.ethers;

const PREDICTION_MARKET_ABI = [
  "function nextMarketId() external view returns (uint256)",
  "function createMarket(string _question, string _category, string[] _options, uint256 _deadline, uint8 _seedOption, uint256 _seedAmount) external",
];

const USDC_ABI = [
  "function approve(address spender, uint256 amount) external returns (bool)",
  "function allowance(address owner, address spender) external view returns (uint256)",
];

// Hardcoded for Base Sepolia — update if redeployed
const PREDICTION_MARKET_ADDRESS = "0x61C3dcCC562cCAaE2F5f4657Df5a48ff184398d5";
const USDC_ADDRESS               = "0x036CbD53842c5426634e7929541eC2318f3dCF7e";

const SEED_AMOUNT = 5_000_000n; // $5 USDC (6 decimals)

const markets = [
  { q: "Will BTC hit $100k by EOY 2025?",          cat: "Crypto",   side: 0 }, // creator bets YES
  { q: "Will ETH surpass $5,000 in Q3 2025?",      cat: "Crypto",   side: 1 }, // creator bets NO
  { q: "US Federal Reserve cut rates this year?",   cat: "Macro",    side: 0 },
  { q: "Will Base hit 1M daily transactions?",      cat: "Tech",     side: 0 },
  { q: "Will AI pass the Turing test by 2026?",     cat: "Tech",     side: 1 },
  { q: "Real Madrid to win Champions League 2025?", cat: "Sports",   side: 0 },
];

async function main() {
  const [signer] = await ethers.getSigners();
  console.log("Seeder wallet:", signer.address);

  const contract = new ethers.Contract(PREDICTION_MARKET_ADDRESS, PREDICTION_MARKET_ABI, signer);
  const usdc     = new ethers.Contract(USDC_ADDRESS, USDC_ABI, signer);

  const currentCount = await contract.nextMarketId();
  const startFrom    = Number(currentCount);

  if (startFrom >= markets.length) {
    console.log(`✅ All ${markets.length} markets already seeded (count: ${startFrom}). Nothing to do.`);
    return;
  }

  const remaining  = markets.slice(startFrom);
  const totalSeed  = SEED_AMOUNT * BigInt(remaining.length);

  console.log(`\n▶ Resuming from market #${startFrom} — ${remaining.length} remaining`);
  console.log(`Approving ${ethers.formatUnits(totalSeed, 6)} USDC for market creation...`);

  const approveTx = await usdc.approve(PREDICTION_MARKET_ADDRESS, totalSeed);
  await approveTx.wait(1);
  console.log("✅ USDC approved");

  const deadline = Math.floor(Date.now() / 1000) + 60 * 60 * 24 * 7; // 7 days

  for (const m of remaining) {
    console.log(`\nCreating: "${m.q}"`);
    const tx = await contract.createMarket(
      m.q,
      m.cat,
      ["YES", "NO"],
      deadline,
      m.side,
      SEED_AMOUNT
    );
    await tx.wait(1);
    console.log("  ✅ Created & seeded with $5 USDC on", m.side === 0 ? "YES" : "NO");
  }

  const finalCount = await contract.nextMarketId();
  console.log(`\n🎉 Successfully seeded ${finalCount} markets total!`);
}


main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
