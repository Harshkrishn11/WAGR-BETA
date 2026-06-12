/* eslint-disable @typescript-eslint/no-require-imports */
// Using require() because Hardhat is a CommonJS module
const hre = require("hardhat");
const ethers = hre.ethers;
const fs = require("fs");
const path = require("path");

const TREASURY = "0x225FF3AacD6328301a35614DC5f5AE173f595294";
const BASE_SEPOLIA_USDC = "0x036CbD53842c5426634e7929541eC2318f3dCF7e";
const BASE_MAINNET_USDC  = "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913";

async function main() {
  const [deployer] = await ethers.getSigners();
  const network     = await ethers.provider.getNetwork();

  console.log(`\n========================================`);
  console.log(`  WAGR Contract Deployment`);
  console.log(`========================================`);
  console.log(`Network:  ${network.name} (chainId: ${network.chainId})`);
  console.log(`Deployer: ${deployer.address}`);
  const bal = await ethers.provider.getBalance(deployer.address);
  console.log(`Balance:  ${ethers.formatEther(bal)} ETH`);
  console.log(`Treasury: ${TREASURY}`);

  // ── Pick USDC address ──
  let usdcAddress;
  if (network.chainId === 8453n) {
    usdcAddress = BASE_MAINNET_USDC;
    console.log(`USDC:     Base Mainnet USDC`);
  } else if (network.chainId === 84532n) {
    usdcAddress = BASE_SEPOLIA_USDC;
    console.log(`USDC:     Base Sepolia USDC`);
  } else {
    // Local Hardhat node — deploy MockUSDC
    console.log(`\nDeploying MockUSDC for local testing...`);
    const MockUSDC = await ethers.getContractFactory("MockUSDC");
    const mock     = await MockUSDC.deploy();
    await mock.waitForDeployment();
    usdcAddress = await mock.getAddress();
    console.log(`MockUSDC: ${usdcAddress}`);
  }

  // ── Deploy WagrPredictionMarket ──
  console.log(`\nDeploying WagrPredictionMarket...`);
  const WagrPredictionMarket = await ethers.getContractFactory("WagrPredictionMarket");
  const predictionMarket = await WagrPredictionMarket.deploy(usdcAddress, TREASURY, deployer.address);
  await predictionMarket.waitForDeployment();
  const predictionMarketAddr = await predictionMarket.getAddress();
  console.log(`✅ WagrPredictionMarket: ${predictionMarketAddr}`);

  // ── Deploy FriendBet ──
  console.log(`\nDeploying FriendBet...`);
  const FriendBet     = await ethers.getContractFactory("FriendBet");
  const friendBet     = await FriendBet.deploy(usdcAddress, TREASURY, deployer.address);
  await friendBet.waitForDeployment();
  const friendBetAddr = await friendBet.getAddress();
  console.log(`✅ FriendBet: ${friendBetAddr}`);

  // ── Deploy DailyGame ──
  console.log(`\nDeploying DailyGame...`);
  const DailyGame     = await ethers.getContractFactory("DailyGame");
  const dailyGame     = await DailyGame.deploy(usdcAddress, TREASURY, deployer.address);
  await dailyGame.waitForDeployment();
  const dailyGameAddr = await dailyGame.getAddress();
  console.log(`✅ DailyGame: ${dailyGameAddr}`);

  // ── Print env vars ──
  console.log(`\n========================================`);
  console.log(`  Deployment Complete!`);
  console.log(`========================================`);
  console.log(`\nCopy these into your .env.local:\n`);
  console.log(`NEXT_PUBLIC_PREDICTION_MARKET_ADDRESS=${predictionMarketAddr}`);
  console.log(`NEXT_PUBLIC_FRIEND_BET_ADDRESS=${friendBetAddr}`);
  console.log(`NEXT_PUBLIC_DAILY_GAME_ADDRESS=${dailyGameAddr}`);
  console.log(`\n========================================\n`);

  // ── Save deployments/chainId.json ──
  const summary = {
    network:   network.name,
    chainId:   network.chainId.toString(),
    deployer:  deployer.address,
    treasury:  TREASURY,
    usdc:      usdcAddress,
    PredictionMarket: predictionMarketAddr,
    FriendBet: friendBetAddr,
    DailyGame: dailyGameAddr,
    timestamp: new Date().toISOString(),
  };

  const outDir = path.join(process.cwd(), "deployments");
  if (!fs.existsSync(outDir)) fs.mkdirSync(outDir);
  const outFile = path.join(outDir, `${network.chainId}.json`);
  fs.writeFileSync(outFile, JSON.stringify(summary, null, 2));
  console.log(`Saved deployment info → deployments/${network.chainId}.json`);
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
