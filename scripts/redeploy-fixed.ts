/* eslint-disable @typescript-eslint/no-require-imports */
// Deploys ONLY the updated contracts: DailyGame v2 + FriendBet v2
const hre = require("hardhat");
const ethers = hre.ethers;
const fs = require("fs");
const path = require("path");

const TREASURY = "0x225FF3AacD6328301a35614DC5f5AE173f595294";
const BASE_SEPOLIA_USDC = "0x036CbD53842c5426634e7929541eC2318f3dCF7e";

async function main() {
  const [deployer] = await ethers.getSigners();
  const network = await ethers.provider.getNetwork();
  const bal = await ethers.provider.getBalance(deployer.address);

  console.log(`\n========================================`);
  console.log(`  WAGR Security Fix — Redeploy`);
  console.log(`========================================`);
  console.log(`Network:  ${network.name} (chainId: ${network.chainId})`);
  console.log(`Deployer: ${deployer.address}`);
  console.log(`Balance:  ${ethers.formatEther(bal)} ETH`);

  if (network.chainId !== 84532n) {
    throw new Error("This script is for Base Sepolia only (chainId 84532)");
  }

  // ── Deploy FriendBet v2 (with claimStalemate fix) ──
  console.log(`\nDeploying FriendBet v2 (stalemate fix)...`);
  const FriendBet = await ethers.getContractFactory("FriendBet");
  const friendBet = await FriendBet.deploy(BASE_SEPOLIA_USDC, TREASURY, deployer.address);
  await friendBet.waitForDeployment();
  const friendBetAddr = await friendBet.getAddress();
  console.log(`✅ FriendBet v2: ${friendBetAddr}`);

  // ── Deploy DailyGame v2 (DoS fix, pull-payment) ──
  console.log(`\nDeploying DailyGame v2 (pull-payment fix)...`);
  const DailyGame = await ethers.getContractFactory("DailyGame");
  const dailyGame = await DailyGame.deploy(BASE_SEPOLIA_USDC, TREASURY, deployer.address);
  await dailyGame.waitForDeployment();
  const dailyGameAddr = await dailyGame.getAddress();
  console.log(`✅ DailyGame v2: ${dailyGameAddr}`);

  console.log(`\n========================================`);
  console.log(`  Add these to your .env.local:`);
  console.log(`========================================`);
  console.log(`NEXT_PUBLIC_FRIEND_BET_ADDRESS=${friendBetAddr}`);
  console.log(`NEXT_PUBLIC_DAILY_GAME_ADDRESS=${dailyGameAddr}`);
  console.log(`\n========================================\n`);

  // Save
  const summary = {
    network: network.name,
    chainId: network.chainId.toString(),
    deployer: deployer.address,
    FriendBet_v2: friendBetAddr,
    DailyGame_v2: dailyGameAddr,
    timestamp: new Date().toISOString(),
  };
  const outDir = path.join(process.cwd(), "deployments");
  if (!fs.existsSync(outDir)) fs.mkdirSync(outDir);
  const outFile = path.join(outDir, `security-fix-${Date.now()}.json`);
  fs.writeFileSync(outFile, JSON.stringify(summary, null, 2));
  console.log(`Saved → ${outFile}`);
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
