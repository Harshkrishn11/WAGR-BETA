import { baseSepolia, base } from "thirdweb/chains";
import { getContract } from "thirdweb";
import { client } from "./thirdweb";
import PREDICTION_MARKET_ABI from "./WagrPredictionMarket.json";

// ============================================================
//  Chain Config
// ============================================================

const chainId = parseInt(process.env.NEXT_PUBLIC_CHAIN_ID || "84532");

/** Active chain — switch to `base` for mainnet */
export const activeChain = chainId === 8453 ? base : baseSepolia;

// ============================================================
//  Token Addresses
// ============================================================

/** USDC contract address for the active chain */
export const USDC_ADDRESS = process.env.NEXT_PUBLIC_USDC_ADDRESS as `0x${string}`;

/** Treasury wallet address (receives 3% fee) */
export const TREASURY_ADDRESS = process.env.NEXT_PUBLIC_TREASURY_ADDRESS as `0x${string}`;

// ============================================================
//  Contract Addresses
// ============================================================

export const PREDICTION_MARKET_ADDRESS = process.env.NEXT_PUBLIC_PREDICTION_MARKET_ADDRESS as `0x${string}` | undefined;
export const FRIEND_BET_ADDRESS = process.env.NEXT_PUBLIC_FRIEND_BET_ADDRESS as `0x${string}` | undefined;

// ============================================================
//  ABIs
// ============================================================


export const FRIEND_BET_ABI = [
  // View
  {
    name: "getBet",
    type: "function",
    stateMutability: "view",
    inputs: [{ name: "_betId", type: "uint256" }],
    outputs: [
      {
        name: "",
        type: "tuple",
        components: [
          { name: "id", type: "uint256" },
          { name: "creator", type: "address" },
          { name: "opponent", type: "address" },
          { name: "judge", type: "address" },
          { name: "amount", type: "uint256" },
          { name: "condition", type: "string" },
          { name: "deadline", type: "uint256" },
          { name: "status", type: "uint8" },
          { name: "winner", type: "address" },
        ],
      },
    ],
  },
  {
    name: "betCounter",
    type: "function",
    stateMutability: "view",
    inputs: [],
    outputs: [{ type: "uint256" }],
  },
  {
    name: "getBetsForUser",
    type: "function",
    stateMutability: "view",
    inputs: [{ name: "_user", type: "address" }],
    outputs: [{ type: "uint256[]" }],
  },
  // Write
  {
    name: "createBet",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [
      { name: "_condition", type: "string" },
      { name: "_amount", type: "uint256" },
      { name: "_judge", type: "address" },
      { name: "_deadline", type: "uint256" },
    ],
    outputs: [{ name: "betId", type: "uint256" }],
  },
  {
    name: "acceptBet",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [{ name: "_betId", type: "uint256" }],
    outputs: [],
  },
  {
    name: "resolveBet",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [
      { name: "_betId", type: "uint256" },
      { name: "_winner", type: "address" },
    ],
    outputs: [],
  },
  {
    name: "cancelBet",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [{ name: "_betId", type: "uint256" }],
    outputs: [],
  },
  {
    name: "claimStalemate",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [{ name: "_betId", type: "uint256" }],
    outputs: [],
  },
] as const;

export const ERC20_ABI = [
  {
    name: "approve",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [
      { name: "spender", type: "address" },
      { name: "amount", type: "uint256" },
    ],
    outputs: [{ type: "bool" }],
  },
  {
    name: "allowance",
    type: "function",
    stateMutability: "view",
    inputs: [
      { name: "owner", type: "address" },
      { name: "spender", type: "address" },
    ],
    outputs: [{ type: "uint256" }],
  },
  {
    name: "balanceOf",
    type: "function",
    stateMutability: "view",
    inputs: [{ name: "account", type: "address" }],
    outputs: [{ type: "uint256" }],
  },
] as const;

// ============================================================
//  Contract Instances
// ============================================================

export function getPredictionMarketContract() {
  if (!PREDICTION_MARKET_ADDRESS) return null;
  return getContract({
    client,
    chain: activeChain,
    address: PREDICTION_MARKET_ADDRESS,
    abi: PREDICTION_MARKET_ABI as any,
  });
}

export function getFriendBetContract() {
  if (!FRIEND_BET_ADDRESS) return null;
  return getContract({
    client,
    chain: activeChain,
    address: FRIEND_BET_ADDRESS,
    abi: FRIEND_BET_ABI,
  });
}

export function getUSDCContract() {
  return getContract({
    client,
    chain: activeChain,
    address: USDC_ADDRESS,
    abi: ERC20_ABI,
  });
}
