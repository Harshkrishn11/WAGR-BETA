import { HardhatRuntimeEnvironment } from "hardhat/types";
import { DeployFunction } from "hardhat-deploy/types";

const TREASURY = process.env.NEXT_PUBLIC_TREASURY_ADDRESS || "0x225FF3AacD6328301a35614DC5f5AE173f595294";

// Base Sepolia USDC address
const BASE_SEPOLIA_USDC = "0x036CbD53842c5426634e7929541eC2318f3dCF7e";
// Base Mainnet USDC address
const BASE_MAINNET_USDC = "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913";

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const { deployments, getNamedAccounts, network } = hre;
  const { deploy, log } = deployments;
  const { deployer } = await getNamedAccounts();

  // Pick USDC address based on which network we're deploying to
  let usdcAddress: string;
  if (network.name === "base") {
    usdcAddress = BASE_MAINNET_USDC;
  } else if (network.name === "baseSepolia") {
    usdcAddress = BASE_SEPOLIA_USDC;
  } else {
    // Local Hardhat — deploy MockUSDC first
    const mockUsdc = await deploy("MockUSDC", {
      from: deployer,
      log: true,
    });
    usdcAddress = mockUsdc.address;
    log(`MockUSDC deployed at: ${usdcAddress}`);
  }

  log(`Deploying DailyGame with:`);
  log(`  USDC: ${usdcAddress}`);
  log(`  Treasury: ${TREASURY}`);
  log(`  Owner: ${deployer}`);

  const dailyGame = await deploy("DailyGame", {
    from: deployer,
    args: [usdcAddress, TREASURY, deployer],
    log: true,
    waitConfirmations: network.name === "hardhat" ? 1 : 5,
  });

  log(`\n✅ DailyGame deployed at: ${dailyGame.address}`);
  log(`Add this to your .env.local:`);
  log(`NEXT_PUBLIC_DAILY_GAME_ADDRESS=${dailyGame.address}`);
};

export default func;
func.tags = ["DailyGame"];
