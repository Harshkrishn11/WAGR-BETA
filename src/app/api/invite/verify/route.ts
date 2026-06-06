import { NextRequest, NextResponse } from "next/server";
import { redis, CODES_KEY, APPROVED_WALLETS_KEY } from "@/lib/redis";

// POST /api/invite/verify
// Body: { code: string, wallet: string }
export async function POST(req: NextRequest) {
  try {
    const { code, wallet } = await req.json();

    if (!code || !wallet) {
      return NextResponse.json({ error: "Code and wallet are required." }, { status: 400 });
    }

    // Validate wallet address format
    if (!/^0x[a-fA-F0-9]{40}$/.test(wallet)) {
      return NextResponse.json({ error: "Invalid wallet address format." }, { status: 400 });
    }

    const normalizedWallet = wallet.toLowerCase();
    const normalizedCode = code.trim().toUpperCase();

    // Check if wallet is already approved (returning user)
    const alreadyApproved = await redis.sismember(APPROVED_WALLETS_KEY, normalizedWallet);
    if (alreadyApproved) {
      return NextResponse.json({ success: true, message: "Wallet already approved." });
    }

    // ATOMIC: srem returns 1 if removed, 0 if not found
    // This eliminates the TOCTOU race condition (two requests with same code)
    const removed = await redis.srem(CODES_KEY, normalizedCode);
    if (!removed) {
      return NextResponse.json({ error: "Invalid or already used invite code." }, { status: 403 });
    }

    // Code was atomically consumed, now approve the wallet
    await redis.sadd(APPROVED_WALLETS_KEY, normalizedWallet);

    return NextResponse.json({ success: true, message: "Access granted." });
  } catch (err) {
    console.error("Invite verify error:", err);
    return NextResponse.json({ error: "Server error." }, { status: 500 });
  }
}
