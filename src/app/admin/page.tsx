"use client";

import React, { useState, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useReadContract, useSendTransaction, useActiveAccount, ConnectButton } from "thirdweb/react";
import { getContract, prepareContractCall, readContract, waitForReceipt } from "thirdweb";
import { client } from "@/lib/thirdweb";
import { activeChain, PREDICTION_MARKET_ADDRESS } from "@/lib/contracts";
import PREDICTION_MARKET_ABI from "@/lib/WagrPredictionMarket.json";
import { Shield, CheckCircle, XCircle, AlertTriangle, Clock, RefreshCw, ChevronDown, ChevronUp, Search, TrendingUp, DollarSign, Settings, Activity } from "lucide-react";
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
const STATUS_COLORS = ["#16a34a", "#d97706", "#0891B2", "#DC2626"];

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
    if (type === "invalidate_penalty") {
      if (!window.confirm(`⚠️ FORFEIT SEED\n\nThis will invalidate market #${market.id} and send the creator's seed ($${Number(market.creatorSeedAmount ?? 0) / 1e6}) to the treasury as a penalty.\n\nThe creator will NOT get the seed back.\n\nAre you sure?`)) return;
    }
    if (type === "invalidate_goodfaith") {
      if (!window.confirm(`Invalidate market #${market.id} and REFUND the creator's seed ($${Number(market.creatorSeedAmount ?? 0) / 1e6}) back to them?\n\nAll bettors will also be able to claim full refunds.`)) return;
    }
    setPendingAction(type);
    try { await onAction(type, market.id, param); }
    finally { setPendingAction(null); }
  }

  return (
    <div style={{ borderRadius: 16, border: "1px solid #e5e7eb", background: "#ffffff",
      marginBottom: 10, overflow: "hidden", boxShadow: "0 2px 10px rgba(0,0,0,0.02)" }}>
      {/* Row header */}
      <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "14px 18px", cursor: "pointer", background: expanded ? "#f9fafb" : "#ffffff", transition: "background 0.2s" }}
        onClick={() => setExpanded(e => !e)}>
        <span style={{ fontSize: 11, fontFamily: "monospace", minWidth: 24, color: "#9ca3af", fontWeight: 700 }}>#{market.id}</span>
        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={{ margin: 0, fontSize: 14, fontWeight: 700, color: "#111827",
            overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {market.question}
          </p>
          <p style={{ margin: "4px 0 0", fontSize: 11, fontFamily: "monospace", color: "#6b7280" }}>
            {market.category} · Pool: {formatPool(market.totalPool)} · Creator: {shortAddr(market.creator)}
          </p>
        </div>
        
        {isActive && deadlinePassed && (
           <span style={{ fontSize: 10, fontFamily: "monospace", padding: "4px 8px", borderRadius: 6, background: "rgba(220,38,38,0.1)", color: "#DC2626", fontWeight: 700 }}>
             Needs Resolution
           </span>
        )}
        
        <span style={{ fontSize: 11, fontFamily: "monospace", padding: "4px 10px", borderRadius: 99,
          background: `${statusColor}15`, border: `1px solid ${statusColor}35`, color: statusColor, whiteSpace: "nowrap", fontWeight: 700 }}>
          {STATUS_LABELS[market.status]}
        </span>
        {expanded ? <ChevronUp size={16} color="#9ca3af" /> : <ChevronDown size={16} color="#9ca3af" />}
      </div>

      {/* Expanded detail + actions */}
      <AnimatePresence>
        {expanded && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.2 }}
            style={{ overflow: "hidden" }}>
            <div style={{ padding: "0 18px 18px", borderTop: "1px solid #e5e7eb", background: "#f9fafb" }}>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(180px,1fr))", gap: 10, marginTop: 18, marginBottom: 20 }}>
                {[
                  { label: "Deadline",     value: timeStr(market.deadline) },
                  { label: "Total Pool",   value: formatPool(market.totalPool) },
                  { label: "Creator Seed", value: formatPool(market.creatorSeedAmount) },
                  { label: "Creator Fee",  value: formatPool(market.creatorFee) },
                  { label: "Platform Fee", value: formatPool(market.platformFee) },
                  ...(isResolved ? [{ label: "Dispute Ends", value: disputeEnds(market.resolvedAt) }] : []),
                ].map(({ label, value }) => (
                  <div key={label} style={{ padding: "12px 14px", borderRadius: 12,
                    background: "#ffffff", border: "1px solid #e5e7eb" }}>
                    <p style={{ margin: 0, fontSize: 11, color: "#6b7280", fontFamily: "monospace", marginBottom: 6, fontWeight: 600 }}>{label}</p>
                    <p style={{ margin: 0, fontSize: 14, fontWeight: 700, color: "#111827", fontFamily: "monospace" }}>{value}</p>
                  </div>
                ))}
              </div>

              {/* Action buttons */}
              <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>

                {/* Resolve YES / NO — only if active and deadline passed */}
                {isActive && deadlinePassed && (
                  <>
                    <button disabled={!!pendingAction} onClick={() => doAction("resolve", 0)}
                      style={{ display: "flex", alignItems: "center", gap: 6, padding: "10px 18px", borderRadius: 10,
                        fontWeight: 700, fontSize: 13, fontFamily: "monospace", cursor: "pointer",
                        background: "rgba(22,163,74,0.1)", border: "1px solid rgba(22,163,74,0.3)", color: "#16a34a",
                        opacity: pendingAction ? 0.5 : 1 }}>
                      <CheckCircle size={14} />
                      {pendingAction === "resolve_0" ? "Sending..." : "Resolve → YES"}
                    </button>
                    <button disabled={!!pendingAction} onClick={() => doAction("resolve", 1)}
                      style={{ display: "flex", alignItems: "center", gap: 6, padding: "10px 18px", borderRadius: 10,
                        fontWeight: 700, fontSize: 13, fontFamily: "monospace", cursor: "pointer",
                        background: "rgba(220,38,38,0.1)", border: "1px solid rgba(220,38,38,0.3)", color: "#DC2626",
                        opacity: pendingAction ? 0.5 : 1 }}>
                      <XCircle size={14} />
                      {pendingAction === "resolve_1" ? "Sending..." : "Resolve → NO"}
                    </button>
                  </>
                )}

                {isActive && !deadlinePassed && (
                  <span style={{ fontSize: 12, fontFamily: "monospace", color: "#6b7280", padding: "9px 0", display: "flex", alignItems: "center", gap: 6, fontWeight: 600 }}>
                    <Clock size={14} /> Betting still open — cannot resolve yet
                  </span>
                )}

                {/* Override during dispute window */}
                {isResolved && (
                  <>
                    <button disabled={!!pendingAction} onClick={() => doAction("override", 0)}
                      style={{ display: "flex", alignItems: "center", gap: 6, padding: "10px 18px", borderRadius: 10,
                        fontWeight: 700, fontSize: 13, fontFamily: "monospace", cursor: "pointer",
                        background: "rgba(8,145,178,0.1)", border: "1px solid rgba(8,145,178,0.3)", color: "#0891B2",
                        opacity: pendingAction ? 0.5 : 1 }}>
                      <RefreshCw size={14} /> Override → YES
                    </button>
                    <button disabled={!!pendingAction} onClick={() => doAction("override", 1)}
                      style={{ display: "flex", alignItems: "center", gap: 6, padding: "10px 18px", borderRadius: 10,
                        fontWeight: 700, fontSize: 13, fontFamily: "monospace", cursor: "pointer",
                        background: "rgba(8,145,178,0.1)", border: "1px solid rgba(8,145,178,0.3)", color: "#0891B2",
                        opacity: pendingAction ? 0.5 : 1 }}>
                      <RefreshCw size={14} /> Override → NO
                    </button>
                    <button disabled={!!pendingAction} onClick={() => doAction("finalize")}
                      style={{ display: "flex", alignItems: "center", gap: 6, padding: "10px 18px", borderRadius: 10,
                        fontWeight: 700, fontSize: 13, fontFamily: "monospace", cursor: "pointer",
                        background: "rgba(124,58,237,0.1)", border: "1px solid rgba(124,58,237,0.3)", color: "#7C3AED",
                        opacity: pendingAction ? 0.5 : 1 }}>
                      <CheckCircle size={14} /> Finalize (Open Claims)
                    </button>
                  </>
                )}

                {/* Invalidate — active or resolved markets */}
                {(isActive || isResolved) && (
                  <>
                    <button disabled={!!pendingAction} onClick={() => doAction("invalidate_goodfaith")}
                      style={{ display: "flex", alignItems: "center", gap: 6, padding: "10px 18px", borderRadius: 10,
                        fontWeight: 700, fontSize: 13, fontFamily: "monospace", cursor: "pointer",
                        background: "rgba(59,130,246,0.08)", border: "1px solid rgba(59,130,246,0.3)", color: "#2563EB",
                        opacity: pendingAction ? 0.5 : 1 }}>
                      <AlertTriangle size={14} /> Invalidate & Refund Seed to Creator
                    </button>
                    <button disabled={!!pendingAction} onClick={() => doAction("invalidate_penalty")}
                      style={{ display: "flex", alignItems: "center", gap: 6, padding: "10px 18px", borderRadius: 10,
                        fontWeight: 700, fontSize: 13, fontFamily: "monospace", cursor: "pointer",
                        background: "rgba(220,38,38,0.1)", border: "1px solid rgba(220,38,38,0.3)", color: "#DC2626",
                        opacity: pendingAction ? 0.5 : 1 }}>
                      <AlertTriangle size={14} /> Invalidate & Forfeit Seed (Penalty)
                    </button>
                  </>
                )}

                {isClaimable && (
                  <span style={{ fontSize: 13, fontFamily: "monospace", color: "#0891B2", padding: "9px 0", fontWeight: 700 }}>
                    ✅ Claims are open — winners can claim winnings
                  </span>
                )}
                {isInvalidated && (
                  <span style={{ fontSize: 13, fontFamily: "monospace", color: "#DC2626", padding: "9px 0", fontWeight: 700 }}>
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
    <div style={{ background: "#ffffff", border: "1px solid #e5e7eb", borderRadius: 20, padding: 24, display: "flex", flexDirection: "column", gap: 16, boxShadow: "0 4px 20px rgba(0,0,0,0.03)" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <p style={{ margin: 0, fontSize: 13, fontFamily: "monospace", color: "#6b7280", fontWeight: 600 }}>{title}</p>
        <div style={{ padding: 8, borderRadius: 10, background: `${color}15`, color }}>
          <Icon size={18} />
        </div>
      </div>
      <div>
        <h3 style={{ margin: 0, fontSize: 32, fontWeight: 800, fontFamily: "var(--font-space-grotesk,sans-serif)", color: "#111827", letterSpacing: "-0.02em" }}>{value}</h3>
        {sub && <p style={{ margin: "6px 0 0", fontSize: 12, fontFamily: "monospace", color: "#9ca3af", fontWeight: 600 }}>{sub}</p>}
      </div>
    </div>
  );
}

// ─── Settings Panel ──────────────────────────────────────────
function SettingsPanel({ contract, sendTx, setTxMsg }: { contract: any; sendTx: any; setTxMsg: (s: string) => void }) {
  const [treasuryInput, setTreasuryInput] = useState("");
  const [minSeedInput, setMinSeedInput] = useState("");
  const [newOwnerInput, setNewOwnerInput] = useState("");
  const [loading, setLoading] = useState<string | null>(null);

  // Read current values from chain
  const { data: currentTreasury } = useReadContract({ contract, method: "treasuryAddress", params: [] } as any);
  const { data: currentMinSeed } = useReadContract({ contract, method: "minSeedAmount", params: [] } as any);
  const { data: isPaused } = useReadContract({ contract, method: "paused", params: [] } as any);
  const { data: currentOwner } = useReadContract({ contract, method: "owner", params: [] } as any);

  const treasuryAddr = typeof currentTreasury === "string" ? currentTreasury : "";
  const minSeedUSDC = currentMinSeed ? Number(currentMinSeed) / 1e6 : 5;
  const paused = isPaused === true;
  const ownerAddr = typeof currentOwner === "string" ? currentOwner : "";

  async function execTx(label: string, method: string, params: any[]) {
    setLoading(label);
    setTxMsg("⏳ Sending transaction...");
    try {
      const tx = prepareContractCall({ contract, method, params });
      let txHash: `0x${string}` = "0x";
      await new Promise<void>((res, rej) => {
        sendTx(tx, {
          onSuccess: async (result: any) => {
            txHash = result?.transactionHash ?? "0x";
            try {
              if (txHash && txHash !== "0x") {
                await waitForReceipt({ client, chain: activeChain, transactionHash: txHash });
              }
              setTxMsg(`✅ ${label} — Done!`);
              res();
            } catch {
              setTxMsg(`✅ ${label} — Tx sent, awaiting confirmation...`);
              res();
            }
          },
          onError: (e: any) => rej(e),
        });
      });
    } catch (e: any) {
      setTxMsg(`❌ ${label} failed: ${e?.message?.slice(0, 80) ?? "Unknown error"}`);
    } finally {
      setLoading(null);
    }
  }

  const cardStyle: React.CSSProperties = { background: "#ffffff", border: "1px solid #e5e7eb", borderRadius: 20, padding: "24px 28px", marginBottom: 20, boxShadow: "0 2px 12px rgba(0,0,0,0.03)" };
  const labelStyle: React.CSSProperties = { fontSize: 14, fontWeight: 700, color: "#111827", marginBottom: 6, fontFamily: "var(--font-space-grotesk,sans-serif)" };
  const subStyle: React.CSSProperties = { fontSize: 12, color: "#6b7280", fontFamily: "monospace", marginBottom: 14, lineHeight: 1.5 };
  const inputStyle: React.CSSProperties = { width: "100%", padding: "12px 16px", borderRadius: 12, border: "1px solid #e5e7eb", background: "#f9fafb", color: "#111827", fontSize: 14, fontFamily: "monospace", outline: "none", boxSizing: "border-box", transition: "border-color 0.2s" };
  const btnStyle = (color: string, disabled?: boolean): React.CSSProperties => ({
    padding: "11px 22px", borderRadius: 12, fontSize: 13, fontWeight: 700, fontFamily: "monospace",
    cursor: disabled ? "not-allowed" : "pointer", transition: "all 0.2s",
    background: disabled ? "#e5e7eb" : `${color}15`, border: `1px solid ${disabled ? "#d1d5db" : color}40`,
    color: disabled ? "#9ca3af" : color, opacity: disabled ? 0.6 : 1, whiteSpace: "nowrap",
  });

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>

      {/* ── Treasury Address ── */}
      <div style={cardStyle}>
        <p style={labelStyle}>🏦 Treasury Address</p>
        <p style={subStyle}>
          Where the 1% platform fee is sent on market resolution.<br/>
          Current: <span style={{ color: "#7C3AED", fontWeight: 600 }}>{treasuryAddr ? `${treasuryAddr.slice(0, 10)}...${treasuryAddr.slice(-6)}` : "Loading..."}</span>
        </p>
        <div style={{ display: "flex", gap: 10 }}>
          <input
            type="text" placeholder="0x..." value={treasuryInput}
            onChange={e => setTreasuryInput(e.target.value)}
            onFocus={e => e.target.style.borderColor = "#7C3AED"}
            onBlur={e => e.target.style.borderColor = "#e5e7eb"}
            style={{ ...inputStyle, flex: 1 }}
          />
          <button
            disabled={!treasuryInput || loading === "treasury" || !/^0x[a-fA-F0-9]{40}$/.test(treasuryInput)}
            onClick={() => execTx("Treasury Update", "setTreasury", [treasuryInput as `0x${string}`])}
            style={btnStyle("#7C3AED", !treasuryInput || loading === "treasury" || !/^0x[a-fA-F0-9]{40}$/.test(treasuryInput))}
          >
            {loading === "treasury" ? "Sending..." : "Update"}
          </button>
        </div>
      </div>

      {/* ── Min Seed Amount ── */}
      <div style={cardStyle}>
        <p style={labelStyle}>💎 Minimum Seed Amount</p>
        <p style={subStyle}>
          The minimum USDC a creator must deposit to start a market.<br/>
          Current: <span style={{ color: "#16a34a", fontWeight: 600 }}>${minSeedUSDC.toFixed(2)} USDC</span>
        </p>
        <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
          <div style={{ position: "relative", flex: 1 }}>
            <span style={{ position: "absolute", left: 14, top: "50%", transform: "translateY(-50%)", fontSize: 14, color: "#9ca3af", fontFamily: "monospace", pointerEvents: "none" }}>$</span>
            <input
              type="number" min={1} placeholder="5" value={minSeedInput}
              onChange={e => setMinSeedInput(e.target.value)}
              onFocus={e => e.target.style.borderColor = "#16a34a"}
              onBlur={e => e.target.style.borderColor = "#e5e7eb"}
              style={{ ...inputStyle, paddingLeft: 28 }}
            />
          </div>
          <button
            disabled={!minSeedInput || Number(minSeedInput) < 1 || loading === "minseed"}
            onClick={() => execTx("Min Seed Update", "setMinSeedAmount", [BigInt(Math.round(Number(minSeedInput) * 1_000_000))])}
            style={btnStyle("#16a34a", !minSeedInput || Number(minSeedInput) < 1 || loading === "minseed")}
          >
            {loading === "minseed" ? "Sending..." : "Update"}
          </button>
        </div>
        <div style={{ display: "flex", gap: 6, marginTop: 10 }}>
          {[1, 5, 10, 25, 50].map(v => (
            <button key={v} onClick={() => setMinSeedInput(String(v))}
              style={{ flex: 1, padding: "7px 0", borderRadius: 8, fontSize: 11, fontFamily: "monospace", cursor: "pointer",
                background: minSeedInput === String(v) ? "rgba(22,163,74,0.1)" : "#f9fafb",
                border: minSeedInput === String(v) ? "1px solid rgba(22,163,74,0.3)" : "1px solid #e5e7eb",
                color: minSeedInput === String(v) ? "#16a34a" : "#6b7280",
              }}>
              ${v}
            </button>
          ))}
        </div>
      </div>

      {/* ── Emergency Pause ── */}
      <div style={{ ...cardStyle, borderColor: paused ? "rgba(220,38,38,0.3)" : "#e5e7eb", background: paused ? "rgba(220,38,38,0.03)" : "#ffffff" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <p style={labelStyle}>{paused ? "🔴 Contract PAUSED" : "🟢 Contract Active"}</p>
            <p style={{ ...subStyle, marginBottom: 0 }}>
              {paused
                ? "All operations are frozen. No bets, claims, or market creation can happen."
                : "The contract is running normally. Use Emergency Pause to freeze all operations."}
            </p>
          </div>
          <button
            disabled={loading === "pause"}
            onClick={() => execTx(paused ? "Unpause" : "Pause", paused ? "unpause" : "pause", [])}
            style={{
              padding: "14px 28px", borderRadius: 14, fontSize: 14, fontWeight: 800, fontFamily: "monospace",
              cursor: loading === "pause" ? "not-allowed" : "pointer", transition: "all 0.2s",
              background: paused ? "rgba(22,163,74,0.1)" : "rgba(220,38,38,0.1)",
              border: paused ? "1px solid rgba(22,163,74,0.3)" : "1px solid rgba(220,38,38,0.3)",
              color: paused ? "#16a34a" : "#DC2626",
              minWidth: 140,
            }}
          >
            {loading === "pause" ? "Sending..." : paused ? "▶️ Unpause" : "⏸️ Pause"}
          </button>
        </div>
      </div>

      {/* ── Transfer Ownership ── */}
      <div style={{ ...cardStyle, borderColor: "rgba(220,38,38,0.2)", background: "rgba(220,38,38,0.02)" }}>
        <p style={{ ...labelStyle, color: "#DC2626" }}>⚠️ Transfer Ownership</p>
        <p style={subStyle}>
          Transfer admin control to a new wallet. <strong style={{ color: "#DC2626" }}>This is irreversible</strong> — you will lose all admin access.<br/>
          Current owner: <span style={{ color: "#7C3AED", fontWeight: 600 }}>{ownerAddr ? `${ownerAddr.slice(0, 10)}...${ownerAddr.slice(-6)}` : "Loading..."}</span>
        </p>
        <div style={{ display: "flex", gap: 10 }}>
          <input
            type="text" placeholder="0x... new owner address" value={newOwnerInput}
            onChange={e => setNewOwnerInput(e.target.value)}
            onFocus={e => e.target.style.borderColor = "#DC2626"}
            onBlur={e => e.target.style.borderColor = "#e5e7eb"}
            style={{ ...inputStyle, flex: 1, borderColor: "rgba(220,38,38,0.2)" }}
          />
          <button
            disabled={!newOwnerInput || loading === "owner" || !/^0x[a-fA-F0-9]{40}$/.test(newOwnerInput)}
            onClick={() => {
              if (confirm("⚠️ ARE YOU SURE? You will permanently lose admin access to this contract. This cannot be undone.")) {
                execTx("Ownership Transfer", "transferOwnership", [newOwnerInput as `0x${string}`]);
              }
            }}
            style={btnStyle("#DC2626", !newOwnerInput || loading === "owner" || !/^0x[a-fA-F0-9]{40}$/.test(newOwnerInput))}
          >
            {loading === "owner" ? "Sending..." : "Transfer"}
          </button>
        </div>
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
  const [activeTab, setActiveTab] = useState<"dashboard"|"settings">("dashboard");

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
      await new Promise<void>((res, rej) => {
        let txHash: `0x${string}` = "0x";
        sendTx(tx, {
          onSuccess: async (result: any) => {
            txHash = result?.transactionHash ?? "0x";
            try {
              if (txHash && txHash !== "0x") {
                await waitForReceipt({ client, chain: activeChain, transactionHash: txHash });
              }
              setTxMsg("✅ Done! Refresh to see updated status.");
              res();
            } catch (e) {
              setTxMsg("✅ Tx sent! Waiting for confirmation...");
              res();
            }
          },
          onError: (e) => rej(e),
        });
      });
    } catch (e: any) {
      setTxMsg(`❌ Error: ${e?.message?.slice(0, 80) ?? "Transaction failed"}`);
    }
  }

  // ── Auth Gate: Only wallet owner can access ──
  if (!account || !ownerAddress) {
    return (
      <main style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", padding: 24, background: "#ffffff" }}>
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
          style={{ maxWidth: 400, width: "100%", padding: "40px 32px", borderRadius: 24,
            border: "1px solid #e5e7eb", background: "#f9fafb", display: "flex", flexDirection: "column", alignItems: "center", gap: 20, boxShadow: "0 4px 24px rgba(0,0,0,0.04)" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <Shield size={24} color="#7C3AED" />
            <h1 style={{ margin: 0, fontSize: 22, fontWeight: 800, color: "#111827", fontFamily: "var(--font-space-grotesk,sans-serif)" }}>Admin Panel</h1>
          </div>
          <p style={{ margin: 0, fontSize: 13, color: "#6b7280", fontFamily: "monospace", textAlign: "center", lineHeight: 1.5 }}>
            Connect the contract owner wallet to access the admin panel.
          </p>
          <ConnectButton client={client} />
        </motion.div>
      </main>
    );
  }

  if (!isOwner) {
    return (
      <main style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", padding: 24, background: "#ffffff" }}>
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
          style={{ maxWidth: 400, width: "100%", padding: "40px 32px", borderRadius: 24,
            border: "1px solid rgba(220,38,38,0.2)", background: "rgba(220,38,38,0.05)", display: "flex", flexDirection: "column", alignItems: "center", gap: 16 }}>
          <Shield size={48} color="#DC2626" />
          <h2 style={{ margin: 0, fontSize: 20, fontWeight: 800, color: "#DC2626" }}>⚠️ Unauthorized Wallet</h2>
          <p style={{ margin: 0, fontSize: 13, color: "#4b5563", fontFamily: "monospace", textAlign: "center", lineHeight: 1.5 }}>
            The connected wallet is not the contract owner.<br/>Switch to the deployer wallet.
          </p>
          <ConnectButton client={client} />
        </motion.div>
      </main>
    );
  }

  return (
    <main style={{ minHeight: "100vh", padding: "80px 24px 80px", background: "#ffffff" }}>
      <div style={{ maxWidth: 1100, margin: "0 auto" }}>

        {/* Header */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 32, flexWrap: "wrap", gap: 12 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
            <div style={{ width: 56, height: 56, borderRadius: 16, background: "rgba(124,58,237,0.1)", border: "1px solid rgba(124,58,237,0.2)", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <Shield size={28} color="#7C3AED" />
            </div>
            <div>
              <h1 style={{ margin: 0, fontSize: 28, fontWeight: 800, color: "#111827", fontFamily: "var(--font-space-grotesk,sans-serif)", letterSpacing: "-0.02em" }}>
                Admin Dashboard
              </h1>
              <p style={{ margin: "4px 0 0", fontSize: 13, color: "#6b7280", fontFamily: "monospace" }}>Manage markets and platform settings</p>
            </div>
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            {!account && (
              <span style={{ fontSize: 12, fontFamily: "monospace", color: "#DC2626", padding: "10px 16px", borderRadius: 10, background: "rgba(220,38,38,0.1)", fontWeight: 700 }}>
                ⚠️ Connect wallet to manage
              </span>
            )}
          </div>
        </div>

        {/* Main Tabs */}
        <div style={{ display: "flex", gap: 24, borderBottom: "1px solid #e5e7eb", marginBottom: 32, overflowX: "auto" }}>
          <button onClick={() => setActiveTab("dashboard")} style={{ padding: "0 0 16px 0", background: "none", border: "none", color: activeTab === "dashboard" ? "#111827" : "#9ca3af", fontWeight: 700, fontSize: 15, cursor: "pointer", borderBottom: activeTab === "dashboard" ? "2px solid #7C3AED" : "2px solid transparent", display: "flex", gap: 8, alignItems: "center", whiteSpace: "nowrap", transition: "all 0.2s" }}>
            <Activity size={18} /> Overview & Markets
          </button>
          <button onClick={() => setActiveTab("settings")} style={{ padding: "0 0 16px 0", background: "none", border: "none", color: activeTab === "settings" ? "#111827" : "#9ca3af", fontWeight: 700, fontSize: 15, cursor: "pointer", borderBottom: activeTab === "settings" ? "2px solid #7C3AED" : "2px solid transparent", display: "flex", gap: 8, alignItems: "center", whiteSpace: "nowrap", transition: "all 0.2s" }}>
            <Settings size={18} /> Advanced Settings
          </button>
        </div>

        {/* Status message */}
        {txMsg && (
          <div style={{ marginBottom: 24, padding: "16px 20px", borderRadius: 16,
            background: txMsg.startsWith("✅") ? "rgba(22,163,74,0.1)" : txMsg.startsWith("❌") ? "rgba(220,38,38,0.1)" : "rgba(8,145,178,0.1)",
            border: `1px solid ${txMsg.startsWith("✅") ? "rgba(22,163,74,0.2)" : txMsg.startsWith("❌") ? "rgba(220,38,38,0.2)" : "rgba(8,145,178,0.2)"}`,
            fontSize: 14, fontFamily: "monospace", fontWeight: 600,
            color: txMsg.startsWith("✅") ? "#16a34a" : txMsg.startsWith("❌") ? "#DC2626" : "#0891B2" }}>
            {txMsg}
          </div>
        )}



        {activeTab === "dashboard" && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            {/* Stats Grid */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: 20, marginBottom: 40 }}>
              <StatCard title="Total Value Locked" value={formatPool(activeTVL)} sub="Across active & disputed" icon={TrendingUp} color="#16a34a" />
              <StatCard title="Total Volume" value={formatPool(totalVolume)} sub={`${count} markets created`} icon={Activity} color="#7C3AED" />
              <StatCard title="Lifetime Revenue" value={formatPool(lifetimeRev)} sub="1% Platform Fee" icon={DollarSign} color="#d97706" />
              <div style={{ background: "#ffffff", border: "1px solid #e5e7eb", borderRadius: 20, padding: 24, display: "flex", flexDirection: "column", gap: 16, boxShadow: "0 4px 20px rgba(0,0,0,0.03)" }}>
                <p style={{ margin: 0, fontSize: 13, fontFamily: "monospace", color: "#6b7280", fontWeight: 600 }}>Revenue Breakdown</p>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span style={{ fontSize: 12, fontFamily: "monospace", color: "#9ca3af", fontWeight: 600 }}>Monthly</span>
                  <span style={{ fontSize: 15, fontWeight: 800, color: "#111827", fontFamily: "monospace" }}>{formatPool(monthlyRev)}</span>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderTop: "1px solid #e5e7eb", paddingTop: 12 }}>
                  <span style={{ fontSize: 12, fontFamily: "monospace", color: "#9ca3af", fontWeight: 600 }}>Quarterly</span>
                  <span style={{ fontSize: 15, fontWeight: 800, color: "#111827", fontFamily: "monospace" }}>{formatPool(quarterlyRev)}</span>
                </div>
              </div>
            </div>

            {/* Controls Row */}
            <div style={{ display: "flex", gap: 16, marginBottom: 24, flexWrap: "wrap", justifyContent: "space-between", alignItems: "center" }}>
              <div style={{ display: "flex", gap: 6, padding: 6, borderRadius: 14, background: "#f9fafb", border: "1px solid #e5e7eb", overflowX: "auto" }}>
                {[
                  ["action",   `⚡ Action Needed (${actionNeededCount})`],
                  ["active",   "🟢 Active"],
                  ["resolved", "🟡 Disputed"],
                  ["done",     "✅ Done"],
                  ["all",      "All Markets"]
                ] .map(([id, label]) => (
                  <button key={id} onClick={() => setFilter(id as any)}
                    style={{ padding: "10px 18px", borderRadius: 10, fontSize: 13, fontWeight: 700, fontFamily: "monospace",
                      cursor: "pointer", border: "none", transition: "all 0.2s", whiteSpace: "nowrap",
                      background: filter === id ? (id === "action" ? "rgba(217,119,6,0.15)" : "rgba(124,58,237,0.15)") : "transparent",
                      color: filter === id ? (id === "action" ? "#d97706" : "#7C3AED") : "#6b7280" }}>
                    {label}
                  </button>
                ))}
              </div>
              <div style={{ position: "relative", width: 280 }}>
                <Search size={16} color="#9ca3af" style={{ position: "absolute", left: 16, top: "50%", transform: "translateY(-50%)" }} />
                <input type="text" placeholder="Search markets..." value={search} onChange={e => setSearch(e.target.value)}
                  style={{ width: "100%", padding: "12px 16px 12px 42px", borderRadius: 12, boxSizing: "border-box",
                    background: "#f9fafb", border: "1px solid #e5e7eb", color: "#111827", fontSize: 14, fontFamily: "inherit", outline: "none", transition: "border-color 0.2s" }}
                  onFocus={e => e.target.style.borderColor = "#7C3AED"}
                  onBlur={e => e.target.style.borderColor = "#e5e7eb"} />
              </div>
            </div>

            {/* Market list */}
            {visible.length === 0 ? (
              <div style={{ textAlign: "center", padding: "80px 0", color: "#9ca3af", fontFamily: "monospace", background: "#f9fafb", borderRadius: 24, border: "1px dashed #e5e7eb", fontSize: 14 }}>
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
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} style={{ maxWidth: 700 }}>
            <h2 style={{ fontSize: 20, color: "#111827", marginBottom: 28, fontFamily: "var(--font-space-grotesk,sans-serif)", fontWeight: 800 }}>Platform Settings</h2>
            <SettingsPanel contract={contract} sendTx={sendTx} setTxMsg={setTxMsg} />
          </motion.div>
        )}

      </div>
    </main>
  );
}
