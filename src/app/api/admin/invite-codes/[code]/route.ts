import { NextRequest, NextResponse } from "next/server";
import { redis, CODES_KEY } from "@/lib/redis";

const ADMIN_WALLET = (process.env.ADMIN_WALLET || "").toLowerCase();

function isAdmin(req: NextRequest) {
  const wallet = req.headers.get("x-admin-wallet")?.toLowerCase() || "";
  return wallet === ADMIN_WALLET;
}

// DELETE /api/admin/invite-codes/[code]
export async function DELETE(req: NextRequest, { params }: { params: Promise<{ code: string }> }) {
  if (!isAdmin(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const resolvedParams = await params;
  const code = decodeURIComponent(resolvedParams.code).toUpperCase();
  await redis.srem(CODES_KEY, code);

  return NextResponse.json({ success: true });
}
