import { NextRequest, NextResponse } from "next/server";
import { redis, APPROVED_WALLETS_KEY } from "@/lib/redis";

// GET /api/invite/check-wallet?wallet=0x...
export async function GET(req: NextRequest) {
  try {
    const wallet = req.nextUrl.searchParams.get("wallet");
    if (!wallet) {
      return NextResponse.json({ approved: false });
    }

    const approved = await redis.sismember(APPROVED_WALLETS_KEY, wallet.toLowerCase());
    return NextResponse.json({ approved: !!approved });
  } catch (err) {
    console.error("Wallet check error:", err);
    return NextResponse.json({ approved: false }, { status: 500 });
  }
}
