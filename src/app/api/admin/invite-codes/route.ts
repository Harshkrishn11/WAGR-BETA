import { NextRequest, NextResponse } from "next/server";
import { redis, CODES_KEY, APPROVED_WALLETS_KEY } from "@/lib/redis";
import { nanoid } from "nanoid";

const ADMIN_WALLET = (process.env.ADMIN_WALLET || "").toLowerCase();

function isAdmin(req: NextRequest) {
  const wallet = req.headers.get("x-admin-wallet")?.toLowerCase() || "";
  return wallet === ADMIN_WALLET;
}

// GET /api/admin/invite-codes — list all active codes + total approved wallets
export async function GET(req: NextRequest) {
  if (!isAdmin(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const codes = await redis.smembers(CODES_KEY);
  const approvedCount = await redis.scard(APPROVED_WALLETS_KEY);

  return NextResponse.json({
    codes: codes.sort(),
    approvedCount,
  });
}

// POST /api/admin/invite-codes — generate new code(s)
// Body: { count?: number } — generates 1 by default, up to 50
export async function POST(req: NextRequest) {
  if (!isAdmin(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const count = Math.min(Number(body.count) || 1, 50);

  const newCodes: string[] = [];
  for (let i = 0; i < count; i++) {
    // Generate a clean, readable code: WAGR-XXXXX
    const code = `WAGR-${nanoid(8).toUpperCase()}`;
    newCodes.push(code);
  }

  await redis.sadd(CODES_KEY, ...newCodes);

  return NextResponse.json({ success: true, codes: newCodes });
}
