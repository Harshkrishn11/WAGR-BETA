import { HardhatUserConfig } from "hardhat/config";
import "@nomicfoundation/hardhat-toolbox";
import * as dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

const RAW_KEY = process.env.DEPLOYER_PRIVATE_KEY || "";
// Only use the key if it looks like a valid 64-char hex private key
const DEPLOYER_PRIVATE_KEY =
  /^[0-9a-fA-F]{64}$/.test(RAW_KEY.replace(/^0x/, "")) ? RAW_KEY : "";

const ALCHEMY_RPC_URL =
  process.env.ALCHEMY_RPC_URL ||
  "https://base-sepolia.g.alchemy.com/v2/FsG7YKYpEt-jo-PEramE-";

const accounts = DEPLOYER_PRIVATE_KEY
  ? [`0x${DEPLOYER_PRIVATE_KEY.replace(/^0x/, "")}` as `0x${string}`]
  : [];

const config: HardhatUserConfig = {
  solidity: {
    version: "0.8.20",
    settings: {
      optimizer: {
        enabled: true,
        runs: 200,
      },
      viaIR: true,
    },
  },
  networks: {
    hardhat: {
      chainId: 31337,
    },
    // Base Sepolia testnet
    baseSepolia: {
      url: ALCHEMY_RPC_URL,
      chainId: 84532,
      accounts,
    },
    // Base Mainnet
    base: {
      url: "https://mainnet.base.org",
      chainId: 8453,
      accounts,
    },
  },
  paths: {
    sources: "./contracts",
    tests: "./test",
    cache: "./cache",
    artifacts: "./artifacts",
  },
};

export default config;
