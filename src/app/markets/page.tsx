"use client";

import React, { useState, useMemo, useEffect, memo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useReadContract } from "thirdweb/react";
import { getContract, readContract } from "thirdweb";
import { client } from "@/lib/thirdweb";
import { activeChain, PREDICTION_MARKET_ADDRESS } from "@/lib/contracts";
import PREDICTION_MARKET_ABI from "@/lib/WagrPredictionMarket.json";
import { Search, Flame, Clock, TrendingUp, Zap, PlusCircle, Filter } from "lucide-react";
import BetModal from "@/components/BetModal";

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
  status: number; // 0=Active,1=Resolved,2=Claimable,3=Invalidated
  totalPool: bigint;
  creatorFee: bigint;
  platformFee: bigint;
  creatorSeedAmount: bigint;
}

// ─── Constants ───────────────────────────────────────────────────
const TABS = [
  { id: "new",     label: "🆕 New",         icon: Zap },
  { id: "trending",label: "🔥 Trending",    icon: Flame },
  { id: "highpool",label: "💰 High Pool",   icon: TrendingUp },
  { id: "ending",  label: "⏰ Ending Soon", icon: Clock },
] as const;

const CATEGORIES = ["All", "Crypto", "Politics", "Sports", "Tech", "Macro", "Entertainment", "Science", "Others"];

const CATCLR: Record<string, string> = {
  Crypto: "#9B5CFF", Politics: "#f59e0b", Sports: "#22d3ee",
  Tech: "#00FF88",   Macro: "#f472b6",    Entertainment: "#fb923c", Science: "#34d399", Others: "#9ca3af"
};

function timeLeft(deadline: bigint): string {
  const diff = Number(deadline) - Math.floor(Date.now() / 1000);
  if (diff <= 0) return "Ended";
  const d = Math.floor(diff / 86400);
  const h = Math.floor((diff % 86400) / 3600);
  const m = Math.floor((diff % 3600) / 60);
  if (d > 0) return `${d}d ${h}h left`;
  if (h > 0) return `${h}h ${m}m left`;
  return `${m}m left`;
}

function shortAddr(addr: string) {
  return addr ? `${addr.slice(0, 6)}...${addr.slice(-4)}` : "";
}

// ─── Market Card ────────────────────────────────────────────────
const MarketCard = memo(function MarketCard({ market }: { market: MarketData }) {
  const contract = getContract({ client, chain: activeChain, address: PREDICTION_MARKET_ADDRESS!, abi: PREDICTION_MARKET_ABI as any });
  const { data: yesPool } = useReadContract({ contract, method: "getOptionPool", params: [BigInt(market.id), 0] } as any);
  const { data: noPool  } = useReadContract({ contract, method: "getOptionPool", params: [BigInt(market.id), 1] } as any);

  const yes = Number(yesPool ?? 0n), no = Number(noPool ?? 0n), total = yes + no;
  const yP = total > 0 ? Math.round((yes / total) * 100) : 50;
  const clr = CATCLR[market.category] ?? "#9B5CFF";
  const isActive = market.status === 0;
  const isInvalidated = market.status === 3;
  const tLeft = timeLeft(market.deadline);
  const isEnded = tLeft === "Ended";
  const router = useRouter();

  return (
    <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}
      whileHover={{ y: -6, transition: { duration: 0.15 } }}
      onClick={() => router.push(`/markets/${market.id}`)}
      style={{ borderRadius: 20, background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)",
        backdropFilter: "blur(12px)", padding: 20, display: "flex", flexDirection: "column", gap: 14, cursor: "pointer",
        transition: "border-color 0.3s, box-shadow 0.3s", height: "100%", boxSizing: "border-box" }}
      onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = `${clr}50`; (e.currentTarget as HTMLElement).style.boxShadow = `0 8px 40px ${clr}15`; }}
      onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = "rgba(255,255,255,0.06)"; (e.currentTarget as HTMLElement).style.boxShadow = "none"; }}
    >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 8 }}>
          <span style={{ fontSize: 10, fontFamily: "monospace", padding: "3px 10px", borderRadius: 99,
            background: `${clr}18`, border: `1px solid ${clr}35`, color: clr }}>
            {market.category}
          </span>
          <span style={{ fontSize: 11, fontFamily: "monospace", color: isEnded ? "#f87171" : "rgba(255,255,255,0.3)" }}>
            {tLeft}
          </span>
        </div>

        <p style={{ fontSize: 14, fontWeight: 600, color: "rgba(255,255,255,0.88)", lineHeight: 1.5, margin: 0,
          display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>
          {market.question}
        </p>

        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <span style={{ fontSize: 13, fontFamily: "monospace", color: "#00FF88", fontWeight: 700 }}>
            ${(Number(market.totalPool) / 1e6).toLocaleString("en", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </span>
          <span style={{ fontSize: 10, fontFamily: "monospace", color: "rgba(255,255,255,0.2)" }}>
            by {shortAddr(market.creator)}
          </span>
        </div>

        {!isInvalidated && (
          <>
            <div style={{ height: 4, background: "rgba(255,255,255,0.06)", borderRadius: 99, overflow: "hidden", display: "flex" }}>
              <div style={{ width: `${yP}%`, background: "linear-gradient(90deg,#00FF88,#34d399)", transition: "width 0.5s" }} />
              <div style={{ width: `${100-yP}%`, background: "linear-gradient(90deg,#f87171,#ef4444)", transition: "width 0.5s" }} />
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
              <button disabled
                style={{ width: "100%", padding: "9px 0", borderRadius: 10, fontSize: 12, fontWeight: 700,
                  fontFamily: "monospace", cursor: "pointer",
                  background: "rgba(0,255,136,0.08)", border: "1px solid rgba(0,255,136,0.18)",
                  color: "#00FF88", transition: "all 0.15s", opacity: isActive ? 1 : 0.5 }}>
                YES {yP}%
              </button>
              <button disabled
                style={{ width: "100%", padding: "9px 0", borderRadius: 10, fontSize: 12, fontWeight: 700,
                  fontFamily: "monospace", cursor: "pointer",
                  background: "rgba(248,113,113,0.08)", border: "1px solid rgba(248,113,113,0.18)",
                  color: "#f87171", transition: "all 0.15s", opacity: isActive ? 1 : 0.5 }}>
                NO {100-yP}%
              </button>
            </div>
          </>
        )}
        {isInvalidated && (
          <div style={{ padding: "10px 14px", borderRadius: 10, background: "rgba(248,113,113,0.07)",
            border: "1px solid rgba(248,113,113,0.15)", fontSize: 12, color: "#f87171", textAlign: "center" }}>
            Market cancelled
          </div>
        )}
      </motion.div>
  );
});

// ─── Loader skeletons ────────────────────────────────────────────
function Skeleton() {
  return (
    <div style={{ borderRadius: 20, background: "rgba(255,255,255,0.025)", border: "1px solid rgba(255,255,255,0.05)",
      height: 220, animation: "pulse 1.5s infinite" }} />
  );
}

// ─── Main Hook: fetch paginated markets (Newest First) ───────────────────────────────
function usePaginatedMarkets(totalMarkets: number, visibleCount: number) {
  const [results, setResults] = useState<{data: any, id: number}[]>([]);
  
  useEffect(() => {
    if (totalMarkets <= 0) {
      setResults([]);
      return;
    }
    let active = true;
    async function load() {
      const contract = getContract({ client, chain: activeChain, address: PREDICTION_MARKET_ADDRESS!, abi: PREDICTION_MARKET_ABI as any });
      const promises = [];
      
      const startId = totalMarkets - 1;
      const limit = Math.min(visibleCount, totalMarkets);
      
      for (let i = 0; i < limit; i++) {
        const id = startId - i;
        promises.push(readContract({ contract, method: "getMarket", params: [BigInt(id)] }));
      }
      try {
        const res = await Promise.all(promises);
        if (active) setResults(res.map((data, idx) => ({ data, id: startId - idx })));
      } catch (err) {
        console.error(err);
      }
    }
    load();
    return () => { active = false; };
  }, [totalMarkets, visibleCount]);
  
  return results;
}

// ─── Page ────────────────────────────────────────────────────────
export default function MarketsPage() {
  const [tab,      setTab]      = useState<"new"|"trending"|"highpool"|"ending">("new");
  const [category, setCategory] = useState("All");
  const [search,   setSearch]   = useState("");
  const [focused,  setFocused]  = useState(false);
  const [visibleCount, setVisibleCount] = useState(12);

  const contract = getContract({ client, chain: activeChain, address: PREDICTION_MARKET_ADDRESS!, abi: PREDICTION_MARKET_ABI as any });
  const { data: countData } = useReadContract({ contract, method: "nextMarketId", params: [] } as any);
  const count = Number(countData ?? 0n);
  const marketResults = usePaginatedMarkets(count, visibleCount);

  const rawMarkets: MarketData[] = marketResults
    .map(r => r.data ? { ...r.data, id: r.id } : null)
    .filter(Boolean) as MarketData[];

  const loading = count > 0 && rawMarkets.length < count;

  const markets = useMemo(() => {
    let list = rawMarkets.filter(m => m.status !== 3); // hide invalidated from main feed
    if (category !== "All") list = list.filter(m => m.category === category);
    if (search.trim())      list = list.filter(m => m.question.toLowerCase().includes(search.toLowerCase()));

    switch (tab) {
      case "new":      return [...list].sort((a, b) => b.id - a.id);
      case "trending": return [...list].sort((a, b) => Number(b.totalPool) - Number(a.totalPool));
      case "highpool": return [...list].sort((a, b) => Number(b.totalPool) - Number(a.totalPool));
      case "ending":   return [...list].filter(m => m.status === 0).sort((a, b) => Number(a.deadline) - Number(b.deadline));
    }
  }, [rawMarkets, tab, category, search]);

  return (
    <main style={{ minHeight: "100vh", padding: "80px 24px 80px" }}>
      <div style={{ maxWidth: 1280, margin: "0 auto" }}>

        {/* Header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginBottom: 32, flexWrap: "wrap", gap: 16 }}>
          <div>
            <div style={{ display: "inline-flex", alignItems: "center", gap: 8, padding: "4px 12px", borderRadius: 99,
              border: "1px solid rgba(155,92,255,0.3)", background: "rgba(155,92,255,0.08)", marginBottom: 12 }}>
              <Flame size={11} color="#9B5CFF" />
              <span style={{ fontSize: 10, fontFamily: "monospace", letterSpacing: "0.12em", textTransform: "uppercase", color: "#c4b5fd" }}>
                All Markets
              </span>
            </div>
            <h1 style={{ fontSize: "clamp(1.8rem,4vw,2.8rem)", fontWeight: 800, color: "#fff", margin: 0,
              fontFamily: "var(--font-space-grotesk,sans-serif)", letterSpacing: "-0.02em" }}>
              Discover Bets
            </h1>
            {count > 0 && (
              <p style={{ fontSize: 13, color: "rgba(255,255,255,0.3)", margin: "6px 0 0", fontFamily: "monospace" }}>
                {count} markets live on-chain
              </p>
            )}
          </div>
          <Link href="/create">
            <button style={{ display: "flex", alignItems: "center", gap: 8, padding: "12px 22px", borderRadius: 14,
              fontWeight: 700, fontSize: 13, color: "#fff", background: "linear-gradient(135deg,#7C3AED,#9B5CFF)",
              border: "none", cursor: "pointer", boxShadow: "0 0 24px rgba(139,92,246,0.4)" }}>
              <PlusCircle size={15} /> Create Market
            </button>
          </Link>
        </div>

        {/* Search + Filters row */}
        <div style={{ display: "flex", gap: 12, marginBottom: 20, flexWrap: "wrap", alignItems: "center" }}>
          {/* Search */}
          <div style={{ position: "relative", flex: "1 1 260px", minWidth: 200 }}>
            <Search size={14} style={{ position: "absolute", left: 14, top: "50%", transform: "translateY(-50%)", color: "rgba(255,255,255,0.25)", pointerEvents: "none" }} />
            <input
              type="text" placeholder="Search markets..." value={search}
              onChange={e => setSearch(e.target.value)}
              onFocus={() => setFocused(true)} onBlur={() => setFocused(false)}
              style={{ width: "100%", padding: "11px 14px 11px 38px", borderRadius: 12, fontSize: 13,
                background: "rgba(255,255,255,0.04)", border: `1px solid ${focused ? "rgba(155,92,255,0.5)" : "rgba(255,255,255,0.08)"}`,
                color: "#fff", outline: "none", boxSizing: "border-box", fontFamily: "Inter,sans-serif",
                transition: "border-color 0.2s" }} />
          </div>

          {/* Category pills */}
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
            {CATEGORIES.map(cat => (
              <button key={cat} onClick={() => setCategory(cat)}
                style={{ padding: "8px 14px", borderRadius: 99, fontSize: 11, fontWeight: 600, fontFamily: "monospace",
                  cursor: "pointer", transition: "all 0.15s",
                  background: category === cat ? "rgba(155,92,255,0.15)" : "rgba(255,255,255,0.04)",
                  border:     category === cat ? "1px solid rgba(155,92,255,0.45)" : "1px solid rgba(255,255,255,0.07)",
                  color:      category === cat ? "#c4b5fd" : "rgba(255,255,255,0.38)" }}>
                {cat}
              </button>
            ))}
          </div>
        </div>

        {/* Tabs */}
        <div style={{ display: "flex", gap: 4, marginBottom: 28, padding: "4px", borderRadius: 14,
          background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)", width: "fit-content" }}>
          {TABS.map(t => (
            <button key={t.id} onClick={() => setTab(t.id as any)}
              style={{ padding: "9px 18px", borderRadius: 10, fontSize: 12, fontWeight: 700,
                fontFamily: "monospace", cursor: "pointer", transition: "all 0.2s", border: "none",
                background: tab === t.id ? "rgba(155,92,255,0.2)" : "transparent",
                color:      tab === t.id ? "#c4b5fd" : "rgba(255,255,255,0.3)",
                boxShadow:  tab === t.id ? "0 0 16px rgba(155,92,255,0.15)" : "none" }}>
              {t.label}
            </button>
          ))}
        </div>

        {/* Grid */}
        {count === 0 ? (
          <div style={{ textAlign: "center", padding: "80px 0", color: "rgba(255,255,255,0.2)" }}>
            <div style={{ fontSize: 40, marginBottom: 16 }}>🔮</div>
            <p style={{ fontSize: 15, fontFamily: "monospace" }}>No markets yet. Be the first to create one!</p>
            <Link href="/create">
              <button style={{ marginTop: 20, padding: "12px 28px", borderRadius: 14, fontWeight: 700, fontSize: 13,
                color: "#fff", background: "linear-gradient(135deg,#7C3AED,#9B5CFF)", border: "none", cursor: "pointer" }}>
                Create First Market
              </button>
            </Link>
          </div>
        ) : loading ? (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(300px,1fr))", gap: 16 }}>
            {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} />)}
          </div>
        ) : markets.length === 0 ? (
          <div style={{ textAlign: "center", padding: "60px 0", color: "rgba(255,255,255,0.2)" }}>
            <div style={{ fontSize: 32, marginBottom: 12 }}>🔍</div>
            <p style={{ fontFamily: "monospace" }}>No markets match your filters.</p>
          </div>
        ) : (
          <AnimatePresence>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))", gap: 20 }}>
              {markets.map((m) => (
                <MarketCard key={m.id} market={m} />
              ))}
            </div>

            {/* Load More Button */}
            {count > visibleCount && (
              <div style={{ display: "flex", justifyContent: "center", marginTop: 40 }}>
                <button 
                  onClick={() => setVisibleCount(v => v + 12)}
                  style={{ padding: "12px 32px", borderRadius: 99, fontSize: 14, fontWeight: 700, fontFamily: "monospace", color: "#fff", background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", cursor: "pointer", transition: "all 0.2s" }}
                  onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = "rgba(255,255,255,0.1)"}
                  onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = "rgba(255,255,255,0.05)"}
                >
                  Load More Markets
                </button>
              </div>
            )}
          </AnimatePresence>
        )}
      </div>

      <style>{`
        @keyframes pulse {
          0%,100% { opacity: 0.4; }
          50%      { opacity: 0.8; }
        }
      `}</style>
    </main>
  );
}
