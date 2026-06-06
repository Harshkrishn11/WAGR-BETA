import { HardhatRuntimeEnvironment } from "hardhat/types";
import { DeployFunction } from "hardhat-deploy/types";

const TREASURY = process.env.NEXT_PUBLIC_TREASURY_ADDRESS || "0x225FF3AacD6328301a35614DC5f5AE173f595294";

const BASE_SEPOLIA_USDC = "0x036CbD53842c5426634e7929541eC2318f3dCF7e";
const BASE_MAINNET_USDC = "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913";

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const { deployments, getNamedAccounts, network } = hre;
  const { deploy, log, get } = deployments;
  const { deployer } = await getNamedAccounts();

  let usdcAddress: string;
  if (network.name === "base") {
    usdcAddress = BASE_MAINNET_USDC;
  } else if (network.name === "baseSepolia") {
    usdcAddress = BASE_SEPOLIA_USDC;
  } else {
    // Re-use MockUSDC deployed in step 01
    const mockUsdc = await get("MockUSDC");
    usdcAddress = mockUsdc.address;
  }

  log(`Deploying FriendBet with:`);
  log(`  USDC: ${usdcAddress}`);
  log(`  Treasury: ${TREASURY}`);
  log(`  Owner: ${deployer}`);

  const friendBet = await deploy("FriendBet", {
    from: deployer,
    args: [usdcAddress, TREASURY, deployer],
    log: true,
    waitConfirmations: network.name === "hardhat" ? 1 : 5,
  });

  log(`\n✅ FriendBet deployed at: ${friendBet.address}`);
  log(`Add this to your .env.local:`);
  log(`NEXT_PUBLIC_FRIEND_BET_ADDRESS=${friendBet.address}`);
};

export default func;
func.tags = ["FriendBet"];
func.dependencies = ["DailyGame"]; // ensures MockUSDC exists for local deploy
