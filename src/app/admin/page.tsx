"use client";

import React, { useState, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useReadContract, useSendTransaction, useActiveAccount, ConnectButton } from "thirdweb/react";
import { getContract, prepareContractCall, readContract } from "thirdweb";
import { client } from "@/lib/thirdweb";
import { activeChain, PREDICTION_MARKET_ADDRESS } from "@/lib/contracts";
import PREDICTION_MARKET_ABI from "@/lib/WagrPredictionMarket.json";
import { Shield, CheckCircle, XCircle, AlertTriangle, Clock, RefreshCw, ChevronDown, ChevronUp, Search, TrendingUp, DollarSign, Settings, Activity, Key, Copy, Trash2, Plus } from "lucide-react";
import toast from "react-hot-toast";

// ─── Types ──────────────────────────────────────────────────────
interface MarketData {
  id: number;
  creator: string;
  question: string;
  category: string;
  options: string[];
  deadline: bigint;
  resolvedAt: bigint;
  correctOptionIndex: number;
  status: number;
  totalPool: bigint;
  creatorFee: bigint;
  platformFee: bigint;
  creatorSeedAmount: bigint;
}

const STATUS_LABELS = ["🟢 Active", "🟡 Resolved (Dispute)", "✅ Claimable", "❌ Invalidated"];
const STATUS_COLORS = ["#00FF88", "#f59e0b", "#00D4FF", "#f87171"];

function shortAddr(a: string) { return `${a.slice(0, 6)}…${a.slice(-4)}`; }
function formatPool(v: bigint | number) { return `$${(Number(v) / 1e6).toFixed(2)}`; }
function timeStr(ts: bigint) {
  if (!ts) return "—";
  return new Date(Number(ts) * 1000).toLocaleString();
}
function disputeEnds(resolvedAt: bigint) {
  const end = Number(resolvedAt) + 86400;
  const now = Math.floor(Date.now() / 1000);
  const diff = end - now;
  if (diff <= 0) return "Expired";
  const h = Math.floor(diff / 3600), m = Math.floor((diff % 3600) / 60);
  return `${h}h ${m}m remaining`;
}

// ─── Fetch all markets hook ──────────────────────────────────────
function useAllMarkets(count: number) {
  const [results, setResults] = useState<{data: any}[]>([]);
  
  useEffect(() => {
    if (count <= 0) {
      setResults([]);
      return;
    }
    let active = true;
    async function load() {
      const contract = getContract({ client, chain: activeChain, address: PREDICTION_MARKET_ADDRESS!, abi: PREDICTION_MARKET_ABI as any });
      const promises = [];
      // Fetching up to 100 markets for admin dashboard
      for (let i = 0; i < Math.min(count, 100); i++) {
        promises.push(readContract({ contract, method: "getMarket", params: [BigInt(i)] }));
      }
      try {
        const res = await Promise.all(promises);
        if (active) setResults(res.map(data => ({ data })));
      } catch (err) {
        console.error(err);
      }
    }
    load();
    return () => { active = false; };
  }, [count]);
  
  return results;
}

// ─── Single Market Row ───────────────────────────────────────────
function AdminMarketRow({ market, onAction }: { market: MarketData; onAction: (type: string, marketId: number, param?: any) => void }) {
  const [expanded, setExpanded] = useState(false);
  const [pendingAction, setPendingAction] = useState<string | null>(null);
  const isActive = market.status === 0;
  const isResolved = market.status === 1;
  const isClaimable = market.status === 2;
  const isInvalidated = market.status === 3;
  const deadlinePassed = Number(market.deadline) < Math.floor(Date.now() / 1000);

  const statusColor = STATUS_COLORS[market.status];

  async function doAction(type: string, param?: any) {
    setPendingAction(type);
    try { await onAction(type, market.id, param); }
    finally { setPendingAction(null); }
  }

  return (
    <div style={{ borderRadius: 16, border: "1px solid rgba(255,255,255,0.07)", background: "rgba(255,255,255,0.02)",
      marginBottom: 10, overflow: "hidden" }}>
      {/* Row header */}
      <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "14px 18px", cursor: "pointer" }}
        onClick={() => setExpanded(e => !e)}>
        <span style={{ fontSize: 11, fontFamily: "monospace", minWidth: 24, color: "rgba(255,255,255,0.3)" }}>#{market.id}</span>
        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={{ margin: 0, fontSize: 13, fontWeight: 600, color: "rgba(255,255,255,0.85)",
            overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {market.question}
          </p>
          <p style={{ margin: "2px 0 0", fontSize: 11, fontFamily: "monospace", color: "rgba(255,255,255,0.25)" }}>
            {market.category} · Pool: {formatPool(market.totalPool)} · Creator: {shortAddr(market.creator)}
          </p>
        </div>
        
        {isActive && deadlinePassed && (
           <span style={{ fontSize: 10, fontFamily: "monospace", padding: "2px 6px", borderRadius: 4, background: "rgba(248,113,113,0.15)", color: "#f87171" }}>
             Needs Resolution
           </span>
        )}
        
        <span style={{ fontSize: 11, fontFamily: "monospace", padding: "3px 10px", borderRadius: 99,
          background: `${statusColor}15`, border: `1px solid ${statusColor}35`, color: statusColor, whiteSpace: "nowrap" }}>
          {STATUS_LABELS[market.status]}
        </span>
        {expanded ? <ChevronUp size={14} color="rgba(255,255,255,0.3)" /> : <ChevronDown size={14} color="rgba(255,255,255,0.3)" />}
      </div>

      {/* Expanded detail + actions */}
      <AnimatePresence>
        {expanded && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.2 }}
            style={{ overflow: "hidden" }}>
            <div style={{ padding: "0 18px 18px", borderTop: "1px solid rgba(255,255,255,0.05)" }}>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(180px,1fr))", gap: 10, marginTop: 14, marginBottom: 16 }}>
                {[
                  { label: "Deadline",     value: timeStr(market.deadline) },
                  { label: "Total Pool",   value: formatPool(market.totalPool) },
                  { label: "Creator Seed", value: formatPool(market.creatorSeedAmount) },
                  { label: "Creator Fee",  value: formatPool(market.creatorFee) },
                  { label: "Platform Fee", value: formatPool(market.platformFee) },
                  ...(isResolved ? [{ label: "Dispute Ends", value: disputeEnds(market.resolvedAt) }] : []),
                ].map(({ label, value }) => (
                  <div key={label} style={{ padding: "10px 14px", borderRadius: 10,
                    background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.05)" }}>
                    <p style={{ margin: 0, fontSize: 10, color: "rgba(255,255,255,0.3)", fontFamily: "monospace", marginBottom: 4 }}>{label}</p>
                    <p style={{ margin: 0, fontSize: 13, fontWeight: 600, color: "rgba(255,255,255,0.8)", fontFamily: "monospace" }}>{value}</p>
                  </div>
                ))}
              </div>

              {/* Action buttons */}
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>

                {/* Resolve YES / NO — only if active and deadline passed */}
                {isActive && deadlinePassed && (
                  <>
                    <button disabled={!!pendingAction} onClick={() => doAction("resolve", 0)}
                      style={{ display: "flex", alignItems: "center", gap: 6, padding: "9px 18px", borderRadius: 10,
                        fontWeight: 700, fontSize: 12, fontFamily: "monospace", cursor: "pointer",
                        background: "rgba(0,255,136,0.1)", border: "1px solid rgba(0,255,136,0.3)", color: "#00FF88",
                        opacity: pendingAction ? 0.5 : 1 }}>
                      <CheckCircle size={13} />
                      {pendingAction === "resolve_0" ? "Sending..." : "Resolve → YES"}
                    </button>
                    <button disabled={!!pendingAction} onClick={() => doAction("resolve", 1)}
                      style={{ display: "flex", alignItems: "center", gap: 6, padding: "9px 18px", borderRadius: 10,
                        fontWeight: 700, fontSize: 12, fontFamily: "monospace", cursor: "pointer",
                        background: "rgba(248,113,113,0.1)", border: "1px solid rgba(248,113,113,0.3)", color: "#f87171",
                        opacity: pendingAction ? 0.5 : 1 }}>
                      <XCircle size={13} />
                      {pendingAction === "resolve_1" ? "Sending..." : "Resolve → NO"}
                    </button>
                  </>
                )}

                {isActive && !deadlinePassed && (
                  <span style={{ fontSize: 12, fontFamily: "monospace", color: "rgba(255,255,255,0.25)", padding: "9px 0" }}>
                    <Clock size={12} style={{ verticalAlign: "middle", marginRight: 4 }} />
                    Betting still open — cannot resolve yet
                  </span>
                )}

                {/* Override during dispute window */}
                {isResolved && (
                  <>
                    <button disabled={!!pendingAction} onClick={() => doAction("override", 0)}
                      style={{ display: "flex", alignItems: "center", gap: 6, padding: "9px 18px", borderRadius: 10,
                        fontWeight: 700, fontSize: 12, fontFamily: "monospace", cursor: "pointer",
                        background: "rgba(0,212,255,0.08)", border: "1px solid rgba(0,212,255,0.3)", color: "#00D4FF",
                        opacity: pendingAction ? 0.5 : 1 }}>
                      <RefreshCw size={12} /> Override → YES
                    </button>
                    <button disabled={!!pendingAction} onClick={() => doAction("override", 1)}
                      style={{ display: "flex", alignItems: "center", gap: 6, padding: "9px 18px", borderRadius: 10,
                        fontWeight: 700, fontSize: 12, fontFamily: "monospace", cursor: "pointer",
                        background: "rgba(0,212,255,0.08)", border: "1px solid rgba(0,212,255,0.3)", color: "#00D4FF",
                        opacity: pendingAction ? 0.5 : 1 }}>
                      <RefreshCw size={12} /> Override → NO
                    </button>
                    <button disabled={!!pendingAction} onClick={() => doAction("finalize")}
                      style={{ display: "flex", alignItems: "center", gap: 6, padding: "9px 18px", borderRadius: 10,
                        fontWeight: 700, fontSize: 12, fontFamily: "monospace", cursor: "pointer",
                        background: "rgba(0,255,136,0.08)", border: "1px solid rgba(0,255,136,0.25)", color: "#00FF88",
                        opacity: pendingAction ? 0.5 : 1 }}>
                      <CheckCircle size={12} /> Finalize (Open Claims)
                    </button>
                  </>
                )}

                {/* Invalidate — active or resolved markets */}
                {(isActive || isResolved) && (
                  <>
                    <button disabled={!!pendingAction} onClick={() => doAction("invalidate_penalty")}
                      style={{ display: "flex", alignItems: "center", gap: 6, padding: "9px 18px", borderRadius: 10,
                        fontWeight: 700, fontSize: 12, fontFamily: "monospace", cursor: "pointer",
                        background: "rgba(248,113,113,0.08)", border: "1px solid rgba(248,113,113,0.3)", color: "#f87171",
                        opacity: pendingAction ? 0.5 : 1 }}>
                      <AlertTriangle size={12} /> Invalidate (Keep Seed)
                    </button>
                    <button disabled={!!pendingAction} onClick={() => doAction("invalidate_goodfaith")}
                      style={{ display: "flex", alignItems: "center", gap: 6, padding: "9px 18px", borderRadius: 10,
                        fontWeight: 700, fontSize: 12, fontFamily: "monospace", cursor: "pointer",
                        background: "rgba(248,113,113,0.04)", border: "1px solid rgba(248,113,113,0.15)", color: "#fca5a5",
                        opacity: pendingAction ? 0.5 : 1 }}>
                      <AlertTriangle size={12} /> Invalidate (Refund Seed)
                    </button>
                  </>
                )}

                {isClaimable && (
                  <span style={{ fontSize: 12, fontFamily: "monospace", color: "#00D4FF", padding: "9px 0" }}>
                    ✅ Claims are open — winners can claim winnings
                  </span>
                )}
                {isInvalidated && (
                  <span style={{ fontSize: 12, fontFamily: "monospace", color: "#f87171", padding: "9px 0" }}>
                    ❌ Market cancelled — users can claim refunds
                  </span>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ─── Stats Card Component ────────────────────────────────────────
function StatCard({ title, value, sub, icon: Icon, color }: any) {
  return (
    <div style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 16, padding: 20, display: "flex", flexDirection: "column", gap: 12 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <p style={{ margin: 0, fontSize: 13, fontFamily: "monospace", color: "rgba(255,255,255,0.4)" }}>{title}</p>
        <div style={{ padding: 6, borderRadius: 8, background: `${color}15`, color }}>
          <Icon size={16} />
        </div>
      </div>
      <div>
        <h3 style={{ margin: 0, fontSize: 28, fontWeight: 800, fontFamily: "var(--font-space-grotesk,sans-serif)", color: "#fff" }}>{value}</h3>
        {sub && <p style={{ margin: "4px 0 0", fontSize: 11, fontFamily: "monospace", color: "rgba(255,255,255,0.3)" }}>{sub}</p>}
      </div>
    </div>
  );
}

// ─── Page ────────────────────────────────────────────────────────
export default function AdminPage() {
  const account = useActiveAccount();
  const { mutate: sendTx } = useSendTransaction();
  const [filter, setFilter]   = useState<"all"|"action"|"active"|"resolved"|"done">("action");
  const [search, setSearch]   = useState("");
  const [txMsg,  setTxMsg]    = useState("");
  const [activeTab, setActiveTab] = useState<"dashboard"|"codes"|"settings">("dashboard");

  // Invite codes state
  const [codes, setCodes] = useState<string[]>([]);
  const [approvedCount, setApprovedCount] = useState(0);
  const [genCount, setGenCount] = useState(1);
  const [codesLoading, setCodesLoading] = useState(false);
  const [generating, setGenerating] = useState(false);

  const contract = getContract({ client, chain: activeChain, address: PREDICTION_MARKET_ADDRESS!, abi: PREDICTION_MARKET_ABI as any });
  const { data: ownerData } = useReadContract({ contract, method: "owner", params: [] } as any);
  const ownerAddress = typeof ownerData === "string" ? ownerData.toLowerCase() : "";
  const isOwner = !!(account && ownerAddress && account.address.toLowerCase() === ownerAddress);

  const { data: countData } = useReadContract({ contract, method: "nextMarketId", params: [], queryOptions: { enabled: isOwner } } as any);
  const count = Number(countData ?? 0n);
  const marketResults = useAllMarkets(isOwner ? count : 0);
  const markets: MarketData[] = useMemo(() => marketResults.map((r, i) => r.data ? { ...r.data, id: i } : null).filter(Boolean) as MarketData[], [marketResults]);

  // Derived Stats
  const now = Math.floor(Date.now() / 1000);
  const totalVolume = markets.reduce((acc, m) => acc + Number(m.totalPool), 0);
  const activeTVL = markets.filter(m => m.status === 0 || m.status === 1).reduce((acc, m) => acc + Number(m.totalPool), 0);
  
  // Revenue calculations
  const thirtyDaysAgo = now - 30 * 86400;
  const ninetyDaysAgo = now - 90 * 86400;
  const lifetimeRev = markets.filter(m => m.status === 2).reduce((acc, m) => acc + Number(m.platformFee), 0);
  const monthlyRev = markets.filter(m => m.status === 2 && Number(m.resolvedAt) >= thirtyDaysAgo).reduce((acc, m) => acc + Number(m.platformFee), 0);
  const quarterlyRev = markets.filter(m => m.status === 2 && Number(m.resolvedAt) >= ninetyDaysAgo).reduce((acc, m) => acc + Number(m.platformFee), 0);

  // Filters
  const visible = markets.filter(m => {
    // text search
    if (search && !m.question.toLowerCase().includes(search.toLowerCase()) && !m.creator.toLowerCase().includes(search.toLowerCase())) return false;
    
    // tab filter
    if (filter === "action") {
      const needsRes = m.status === 0 && Number(m.deadline) < now;
      const inDispute = m.status === 1;
      return needsRes || inDispute;
    }
    if (filter === "active")   return m.status === 0;
    if (filter === "resolved") return m.status === 1; // Dispute
    if (filter === "done")     return m.status === 2 || m.status === 3;
    return true;
  });

  const actionNeededCount = markets.filter(m => (m.status === 0 && Number(m.deadline) < now) || m.status === 1).length;

  async function handleAction(type: string, marketId: number, param?: any) {
    if (!account) { setTxMsg("Connect your wallet first!"); return; }
    setTxMsg("⏳ Sending transaction...");
    try {
      let tx: any;
      if (type === "resolve") {
        tx = prepareContractCall({ contract, method: "resolveMarket", params: [BigInt(marketId), param as number] });
      } else if (type === "override") {
        tx = prepareContractCall({ contract, method: "overrideResolution", params: [BigInt(marketId), param as number] });
      } else if (type === "finalize") {
        tx = prepareContractCall({ contract, method: "finalizeResolution", params: [BigInt(marketId)] });
      } else if (type === "invalidate_penalty") {
        tx = prepareContractCall({ contract, method: "invalidateMarket", params: [BigInt(marketId), true] });
      } else if (type === "invalidate_goodfaith") {
        tx = prepareContractCall({ contract, method: "invalidateMarket", params: [BigInt(marketId), false] });
      }
      await new Promise<void>((res, rej) => sendTx(tx, { onSuccess: () => { setTxMsg("✅ Done! Refresh to see updated status."); res(); }, onError: (e) => rej(e) }));
    } catch (e: any) {
      setTxMsg(`❌ Error: ${e?.message?.slice(0, 80) ?? "Transaction failed"}`);
    }
  }

  // Invite code helpers
  async function fetchCodes() {
    if (!account) return;
    setCodesLoading(true);
    try {
      const res = await fetch("/api/admin/invite-codes", {
        headers: { "x-admin-wallet": account.address },
      });
      const data = await res.json();
      if (data.codes) { setCodes(data.codes); setApprovedCount(data.approvedCount); }
    } finally {
      setCodesLoading(false);
    }
  }

  async function generateCodes() {
    if (!account) return;
    setGenerating(true);
    try {
      const res = await fetch("/api/admin/invite-codes", {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-admin-wallet": account.address },
        body: JSON.stringify({ count: genCount }),
      });
      const data = await res.json();
      if (data.success) { await fetchCodes(); }
    } finally {
      setGenerating(false);
    }
  }

  async function deleteCode(code: string) {
    if (!account) return;
    await fetch(`/api/admin/invite-codes/${encodeURIComponent(code)}`, {
      method: "DELETE",
      headers: { "x-admin-wallet": account.address },
    });
    setCodes(prev => prev.filter(c => c !== code));
  }

  // Load codes when tab is opened
  useEffect(() => {
    if (activeTab === "codes" && account) fetchCodes();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab, account]);

  // ── Auth Gate: Only wallet owner can access ──
  if (!account || !ownerAddress) {
    return (
      <main style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}>
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
          style={{ maxWidth: 400, width: "100%", padding: "40px 32px", borderRadius: 24,
            border: "1px solid rgba(255,255,255,0.08)", background: "rgba(255,255,255,0.03)", backdropFilter: "blur(12px)", display: "flex", flexDirection: "column", alignItems: "center", gap: 20 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <Shield size={22} color="#9B5CFF" />
            <h1 style={{ margin: 0, fontSize: 20, fontWeight: 800, color: "#fff", fontFamily: "var(--font-space-grotesk,sans-serif)" }}>Admin Panel</h1>
          </div>
          <p style={{ margin: 0, fontSize: 13, color: "rgba(255,255,255,0.5)", fontFamily: "monospace", textAlign: "center" }}>
            Connect the contract owner wallet to access the admin panel.
          </p>
          <ConnectButton client={client} />
        </motion.div>
      </main>
    );
  }

  if (!isOwner) {
    return (
      <main style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}>
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
          style={{ maxWidth: 400, width: "100%", padding: "40px 32px", borderRadius: 24,
            border: "1px solid rgba(248,113,113,0.2)", background: "rgba(248,113,113,0.03)", backdropFilter: "blur(12px)", display: "flex", flexDirection: "column", alignItems: "center", gap: 16 }}>
          <Shield size={40} color="#f87171" />
          <h2 style={{ margin: 0, fontSize: 18, fontWeight: 800, color: "#f87171" }}>⚠️ Unauthorized Wallet</h2>
          <p style={{ margin: 0, fontSize: 13, color: "rgba(255,255,255,0.5)", fontFamily: "monospace", textAlign: "center" }}>
            The connected wallet is not the contract owner.<br/>Switch to the deployer wallet.
          </p>
          <ConnectButton client={client} />
        </motion.div>
      </main>
    );
  }

  return (
    <main style={{ minHeight: "100vh", padding: "80px 24px 80px" }}>
      <div style={{ maxWidth: 1100, margin: "0 auto" }}>

        {/* Header */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 32, flexWrap: "wrap", gap: 12 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div style={{ width: 48, height: 48, borderRadius: 16, background: "rgba(155,92,255,0.1)", border: "1px solid rgba(155,92,255,0.2)", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <Shield size={24} color="#9B5CFF" />
            </div>
            <div>
              <h1 style={{ margin: 0, fontSize: 26, fontWeight: 800, color: "#fff", fontFamily: "var(--font-space-grotesk,sans-serif)" }}>
                Admin Dashboard
              </h1>
              <p style={{ margin: 0, fontSize: 12, color: "rgba(255,255,255,0.4)", fontFamily: "monospace" }}>Manage markets and platform settings</p>
            </div>
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            {!account && (
              <span style={{ fontSize: 12, fontFamily: "monospace", color: "#f87171", padding: "10px", borderRadius: 8, background: "rgba(248,113,113,0.1)" }}>
                ⚠️ Connect wallet to manage
              </span>
            )}
          </div>
        </div>

        {/* Main Tabs */}
        <div style={{ display: "flex", gap: 16, borderBottom: "1px solid rgba(255,255,255,0.05)", marginBottom: 32, overflowX: "auto" }}>
          <button onClick={() => setActiveTab("dashboard")} style={{ padding: "0 0 16px 0", background: "none", border: "none", color: activeTab === "dashboard" ? "#fff" : "rgba(255,255,255,0.4)", fontWeight: 700, fontSize: 15, cursor: "pointer", borderBottom: activeTab === "dashboard" ? "2px solid #9B5CFF" : "2px solid transparent", display: "flex", gap: 8, alignItems: "center", whiteSpace: "nowrap" }}>
            <Activity size={16} /> Overview & Markets
          </button>
          <button onClick={() => setActiveTab("codes")} style={{ padding: "0 0 16px 0", background: "none", border: "none", color: activeTab === "codes" ? "#fff" : "rgba(255,255,255,0.4)", fontWeight: 700, fontSize: 15, cursor: "pointer", borderBottom: activeTab === "codes" ? "2px solid #06B6D4" : "2px solid transparent", display: "flex", gap: 8, alignItems: "center", whiteSpace: "nowrap" }}>
            <Key size={16} /> Invite Codes {codes.length > 0 && <span style={{ background: "rgba(6,182,212,0.2)", color: "#06B6D4", fontSize: 11, fontWeight: 800, padding: "2px 8px", borderRadius: 99, fontFamily: "monospace" }}>{codes.length}</span>}
          </button>
          <button onClick={() => setActiveTab("settings")} style={{ padding: "0 0 16px 0", background: "none", border: "none", color: activeTab === "settings" ? "#fff" : "rgba(255,255,255,0.4)", fontWeight: 700, fontSize: 15, cursor: "pointer", borderBottom: activeTab === "settings" ? "2px solid #9B5CFF" : "2px solid transparent", display: "flex", gap: 8, alignItems: "center", whiteSpace: "nowrap" }}>
            <Settings size={16} /> Advanced Settings
          </button>
        </div>

        {/* Status message */}
        {txMsg && (
          <div style={{ marginBottom: 24, padding: "12px 16px", borderRadius: 12,
            background: txMsg.startsWith("✅") ? "rgba(0,255,136,0.06)" : txMsg.startsWith("❌") ? "rgba(248,113,113,0.06)" : "rgba(0,212,255,0.06)",
            border: `1px solid ${txMsg.startsWith("✅") ? "rgba(0,255,136,0.2)" : txMsg.startsWith("❌") ? "rgba(248,113,113,0.2)" : "rgba(0,212,255,0.2)"}`,
            fontSize: 13, fontFamily: "monospace",
            color: txMsg.startsWith("✅") ? "#00FF88" : txMsg.startsWith("❌") ? "#f87171" : "#00D4FF" }}>
            {txMsg}
          </div>
        )}

        {activeTab === "codes" && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            {/* Stats row */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 16, marginBottom: 32 }}>
              <div style={{ background: "rgba(6,182,212,0.06)", border: "1px solid rgba(6,182,212,0.2)", borderRadius: 16, padding: 20 }}>
                <p style={{ margin: "0 0 8px", fontSize: 12, fontFamily: "monospace", color: "rgba(255,255,255,0.4)", textTransform: "uppercase", letterSpacing: "0.1em" }}>Active Codes</p>
                <p style={{ margin: 0, fontSize: 32, fontWeight: 900, color: "#06B6D4", fontFamily: "monospace" }}>{codesLoading ? "..." : codes.length}</p>
              </div>
              <div style={{ background: "rgba(52,211,153,0.06)", border: "1px solid rgba(52,211,153,0.2)", borderRadius: 16, padding: 20 }}>
                <p style={{ margin: "0 0 8px", fontSize: 12, fontFamily: "monospace", color: "rgba(255,255,255,0.4)", textTransform: "uppercase", letterSpacing: "0.1em" }}>Beta Users Approved</p>
                <p style={{ margin: 0, fontSize: 32, fontWeight: 900, color: "#34D399", fontFamily: "monospace" }}>{codesLoading ? "..." : approvedCount}</p>
              </div>
            </div>

            {/* Generate new codes */}
            <div style={{ background: "rgba(6,182,212,0.04)", border: "1px solid rgba(6,182,212,0.15)", borderRadius: 20, padding: 24, marginBottom: 28 }}>
              <h3 style={{ margin: "0 0 16px", fontSize: 16, fontWeight: 800, color: "#fff", display: "flex", alignItems: "center", gap: 8 }}>
                <Plus size={18} color="#06B6D4" /> Generate New Invite Codes
              </h3>
              <div style={{ display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <label style={{ fontSize: 13, color: "rgba(255,255,255,0.5)", fontFamily: "monospace" }}>Count:</label>
                  <input
                    type="number" min={1} max={50} value={genCount}
                    onChange={e => setGenCount(Math.min(50, Math.max(1, Number(e.target.value))))}
                    style={{ width: 70, padding: "8px 12px", borderRadius: 10, border: "1px solid rgba(6,182,212,0.3)", background: "rgba(6,182,212,0.05)", color: "#fff", fontSize: 15, fontFamily: "monospace", outline: "none" }}
                  />
                </div>
                <button
                  onClick={generateCodes}
                  disabled={generating}
                  style={{ padding: "10px 24px", borderRadius: 12, border: "none", background: "linear-gradient(135deg, #0891B2, #06B6D4)", color: "#fff", fontWeight: 800, fontSize: 14, cursor: generating ? "not-allowed" : "pointer", opacity: generating ? 0.6 : 1, display: "flex", alignItems: "center", gap: 8 }}>
                  <Key size={16} /> {generating ? "Generating..." : `Generate ${genCount} Code${genCount > 1 ? "s" : ""}`}
                </button>
                <button
                  onClick={fetchCodes}
                  style={{ padding: "10px 16px", borderRadius: 12, border: "1px solid rgba(255,255,255,0.1)", background: "transparent", color: "rgba(255,255,255,0.5)", cursor: "pointer", display: "flex", alignItems: "center", gap: 6, fontSize: 13 }}>
                  <RefreshCw size={14} /> Refresh
                </button>
              </div>
              <p style={{ margin: "12px 0 0", fontSize: 12, color: "rgba(255,255,255,0.3)", fontFamily: "monospace" }}>
                Each code can only be used once. Codes are in format WAGR-XXXXXXXX.
              </p>
            </div>

            {/* Codes list */}
            <div style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 20, overflow: "hidden" }}>
              <div style={{ padding: "16px 20px", borderBottom: "1px solid rgba(255,255,255,0.05)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <h3 style={{ margin: 0, fontSize: 15, fontWeight: 700, color: "#fff" }}>Active Invite Codes</h3>
                <span style={{ fontSize: 12, fontFamily: "monospace", color: "rgba(255,255,255,0.3)" }}>{codes.length} unused</span>
              </div>
              {codesLoading ? (
                <div style={{ padding: 40, textAlign: "center", color: "rgba(255,255,255,0.3)", fontFamily: "monospace" }}>Loading...</div>
              ) : codes.length === 0 ? (
                <div style={{ padding: 40, textAlign: "center" }}>
                  <Key size={32} color="rgba(255,255,255,0.1)" style={{ marginBottom: 12 }} />
                  <p style={{ color: "rgba(255,255,255,0.3)", margin: 0, fontFamily: "monospace" }}>No active codes. Generate some above.</p>
                </div>
              ) : (
                <div>
                  {codes.map((code, i) => (
                    <div key={code} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "14px 20px",
                      borderBottom: i < codes.length - 1 ? "1px solid rgba(255,255,255,0.03)" : "none",
                      background: i % 2 === 0 ? "transparent" : "rgba(255,255,255,0.01)" }}>
                      <span style={{ fontSize: 15, fontFamily: "monospace", color: "#06B6D4", letterSpacing: "0.08em", fontWeight: 700 }}>{code}</span>
                      <div style={{ display: "flex", gap: 8 }}>
                        <button
                          onClick={() => { navigator.clipboard.writeText(code); toast.success("Copied!"); }}
                          style={{ padding: "6px 12px", borderRadius: 8, border: "1px solid rgba(6,182,212,0.2)", background: "rgba(6,182,212,0.05)", color: "#06B6D4", cursor: "pointer", display: "flex", alignItems: "center", gap: 6, fontSize: 12, fontWeight: 600 }}>
                          <Copy size={13} /> Copy
                        </button>
                        <button
                          onClick={() => deleteCode(code)}
                          style={{ padding: "6px 12px", borderRadius: 8, border: "1px solid rgba(248,113,113,0.2)", background: "rgba(248,113,113,0.05)", color: "#f87171", cursor: "pointer", display: "flex", alignItems: "center", gap: 6, fontSize: 12, fontWeight: 600 }}>
                          <Trash2 size={13} /> Delete
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </motion.div>
        )}

        {activeTab === "dashboard" && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            {/* Stats Grid */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 16, marginBottom: 40 }}>
              <StatCard title="Total Value Locked" value={formatPool(activeTVL)} sub="Across active & disputed" icon={TrendingUp} color="#00FF88" />
              <StatCard title="Total Volume" value={formatPool(totalVolume)} sub={`${count} markets created`} icon={Activity} color="#9B5CFF" />
              <StatCard title="Lifetime Revenue" value={formatPool(lifetimeRev)} sub="1% Platform Fee" icon={DollarSign} color="#f59e0b" />
              <div style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 16, padding: 20, display: "flex", flexDirection: "column", gap: 12 }}>
                <p style={{ margin: 0, fontSize: 13, fontFamily: "monospace", color: "rgba(255,255,255,0.4)" }}>Revenue Breakdown</p>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span style={{ fontSize: 11, fontFamily: "monospace", color: "rgba(255,255,255,0.5)" }}>Monthly</span>
                  <span style={{ fontSize: 14, fontWeight: 700, color: "#fff", fontFamily: "monospace" }}>{formatPool(monthlyRev)}</span>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderTop: "1px solid rgba(255,255,255,0.05)", paddingTop: 8 }}>
                  <span style={{ fontSize: 11, fontFamily: "monospace", color: "rgba(255,255,255,0.5)" }}>Quarterly</span>
                  <span style={{ fontSize: 14, fontWeight: 700, color: "#fff", fontFamily: "monospace" }}>{formatPool(quarterlyRev)}</span>
                </div>
              </div>
            </div>

            {/* Controls Row */}
            <div style={{ display: "flex", gap: 16, marginBottom: 20, flexWrap: "wrap", justifyContent: "space-between", alignItems: "center" }}>
              <div style={{ display: "flex", gap: 4, padding: 4, borderRadius: 12, background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)", overflowX: "auto" }}>
                {[
                  ["action",   `⚡ Action Needed (${actionNeededCount})`],
                  ["active",   "🟢 Active"],
                  ["resolved", "🟡 Disputed"],
                  ["done",     "✅ Done"],
                  ["all",      "All Markets"]
                ] .map(([id, label]) => (
                  <button key={id} onClick={() => setFilter(id as any)}
                    style={{ padding: "8px 16px", borderRadius: 8, fontSize: 12, fontWeight: 700, fontFamily: "monospace",
                      cursor: "pointer", border: "none", transition: "all 0.2s", whiteSpace: "nowrap",
                      background: filter === id ? (id === "action" ? "rgba(255,184,0,0.15)" : "rgba(155,92,255,0.18)") : "transparent",
                      color: filter === id ? (id === "action" ? "#FFB800" : "#c4b5fd") : "rgba(255,255,255,0.3)" }}>
                    {label}
                  </button>
                ))}
              </div>
              <div style={{ position: "relative", width: 240 }}>
                <Search size={14} color="rgba(255,255,255,0.4)" style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)" }} />
                <input type="text" placeholder="Search markets..." value={search} onChange={e => setSearch(e.target.value)}
                  style={{ width: "100%", padding: "10px 10px 10px 36px", borderRadius: 10, boxSizing: "border-box",
                    background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)", color: "#fff", fontSize: 13, fontFamily: "monospace", outline: "none" }} />
              </div>
            </div>

            {/* Market list */}
            {visible.length === 0 ? (
              <div style={{ textAlign: "center", padding: "60px 0", color: "rgba(255,255,255,0.2)", fontFamily: "monospace", background: "rgba(255,255,255,0.01)", borderRadius: 16, border: "1px dashed rgba(255,255,255,0.05)" }}>
                No markets found for this filter.
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column" }}>
                {visible.map(m => (
                  <AdminMarketRow key={m.id} market={m} onAction={handleAction} />
                ))}
              </div>
            )}
          </motion.div>
        )}

        {activeTab === "settings" && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} style={{ maxWidth: 600 }}>
            <h2 style={{ fontSize: 18, color: "#fff", marginBottom: 24, fontFamily: "var(--font-space-grotesk,sans-serif)" }}>Platform Settings</h2>
            <div style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 16, padding: 24 }}>
              <p style={{ color: "rgba(255,255,255,0.5)", fontSize: 13, fontFamily: "monospace", margin: "0 0 20px" }}>
                These settings require the Admin (Owner) wallet to execute. Future updates will add UI controls for min-seed and emergency pause.
              </p>
              <div style={{ padding: 16, background: "rgba(0,0,0,0.2)", borderRadius: 8, border: "1px dashed rgba(255,255,255,0.1)" }}>
                 <p style={{ margin: 0, color: "#9ca3af", fontSize: 12, fontFamily: "monospace" }}>Coming soon: Update Treasury Address, Set Min Seed Amount, Emergency Pause/Unpause.</p>
              </div>
            </div>
          </motion.div>
        )}

      </div>
    </main>
  );
}
