/**
 * Utility functions for WAGR frontend.
 */
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

/**
 * Shortens an Ethereum address to 0x1234...5678 format.
 */
export function shortenAddress(address: string, chars = 4): string {
  if (!address) return "";
  return `${address.slice(0, chars + 2)}...${address.slice(-chars)}`;
}

/**
 * Formats a USDC amount (6 decimals) to a human-readable string.
 * e.g., 1_000_000 => "$1.00"
 */
export function formatUSDC(amount: bigint | number): string {
  const value = Number(amount) / 1_000_000;
  return `$${value.toFixed(2)}`;
}

/**
 * Parses a dollar amount to USDC raw units (6 decimals).
 * e.g., 5 => 5_000_000n
 */
export function parseUSDC(dollars: number): bigint {
  return BigInt(Math.round(dollars * 1_000_000));
}

/**
 * Returns seconds remaining until a deadline.
 */
export function secondsUntil(deadline: number): number {
  return Math.max(0, deadline - Math.floor(Date.now() / 1000));
}

/**
 * Formats a countdown in HH:MM:SS.
 */
export function formatCountdown(seconds: number): string {
  if (seconds <= 0) return "00:00:00";
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  return [h, m, s].map((v) => String(v).padStart(2, "0")).join(":");
}

/**
 * Formats a Unix timestamp to a readable date string.
 */
export function formatDate(timestamp: number): string {
  return new Date(timestamp * 1000).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

/**
 * Returns a status badge config for bet statuses.
 */
export function getBetStatusConfig(status: number): {
  label: string;
  className: string;
} {
  switch (status) {
    case 0:
      return { label: "Open", className: "badge-warning" };
    case 1:
      return { label: "Active", className: "badge-info" };
    case 2:
      return { label: "Resolved", className: "badge-success" };
    case 3:
      return { label: "Cancelled", className: "badge-error" };
    default:
      return { label: "Unknown", className: "badge-default" };
  }
}

/**
 * Copies text to clipboard and returns a promise.
 */
export async function copyToClipboard(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
}

/**
 * Generates a shareable bet URL.
 */
export function getBetShareUrl(betId: bigint | number): string {
  const base =
    typeof window !== "undefined" ? window.location.origin : "https://wagr.xyz";
  return `${base}/bet/${betId.toString()}`;
}

/**
 * Combines tailwind classes safely.
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
