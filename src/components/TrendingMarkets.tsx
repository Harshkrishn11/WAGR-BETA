"use client";
import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";
import Link from "next/link";
import { useReadContract } from "thirdweb/react";
import { getPredictionMarketContract } from "@/lib/contracts";

function Countdown({ endTime }: { endTime: number }) {
  const [t, setT] = useState({ h: 0, m: 0, s: 0 });
  useEffect(() => {
    const calc = () => {
      const diff = Math.max(0, endTime - Math.floor(Date.now() / 1000));
      setT({ h: Math.floor(diff / 3600), m: Math.floor((diff % 3600) / 60), s: diff % 60 });
    };
    calc();
    const id = setInterval(calc, 1000);
    return () => clearInterval(id);
  }, [endTime]);
  const f = (n: number) => String(n).padStart(2, "0");
  return <span className="font-mono text-xs text-white/35">{f(t.h)}:{f(t.m)}:{f(t.s)}</span>;
}

const CAT: Record<string, { dot: string; text: string; bg: string; border: string }> = {
  Crypto:   { dot: "#9B5CFF", text: "text-purple-300", bg: "bg-purple-500/10", border: "border-purple-500/25" },
  Politics: { dot: "#60A5FA", text: "text-blue-300",   bg: "bg-blue-500/10",   border: "border-blue-500/25" },
  Sports:   { dot: "#00D4FF", text: "text-cyan-300",   bg: "bg-cyan-500/10",   border: "border-cyan-500/25" },
  Tech:     { dot: "#00FF88", text: "text-emerald-300",bg: "bg-emerald-500/10",border: "border-emerald-500/25" },
  Macro:    { dot: "#FFB800", text: "text-amber-300",  bg: "bg-amber-500/10",  border: "border-amber-500/25" },
};

function Card({ marketId, index }: { marketId: number; index: number }) {
  const contract = getPredictionMarketContract();
  const { data, isLoading } = useReadContract({
    contract: contract ?? undefined,
    method: "getMarket",
    params: [BigInt(marketId)],
    queryOptions: { enabled: !!contract, refetchInterval: 15000 },
  } as any);

  if (isLoading) return <div className="h-60 rounded-2xl bg-white/[0.03] border border-white/5 animate-pulse" />;
  if (!data) return null;

  const [question, category, endTime, resolved, , totalYes, totalNo] = data as any;
  if (resolved) return null;

  const yes = Number(totalYes) / 1e6;
  const no = Number(totalNo) / 1e6;
  const total = yes + no;
  const yP = total > 0 ? Math.round((yes / total) * 100) : 50;
  const nP = 100 - yP;
  const c = CAT[category] ?? CAT.Crypto;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ delay: index * 0.07 }}
      whileHover={{ y: -5, transition: { duration: 0.18 } }}
      className="group relative flex flex-col gap-4 rounded-2xl border border-white/8 bg-white/[0.035] backdrop-blur-xl p-5 overflow-hidden hover:border-purple-500/40 transition-all duration-300"
      style={{ boxShadow: "0 0 0 rgba(155,92,255,0)" }}
      onMouseEnter={(e) => (e.currentTarget.style.boxShadow = "0 4px 40px rgba(155,92,255,0.12)")}
      onMouseLeave={(e) => (e.currentTarget.style.boxShadow = "0 0 0 rgba(155,92,255,0)")}
    >
      {/* Top: badge + timer */}
      <div className="flex items-center justify-between">
        <span className={`text-[10px] font-mono uppercase tracking-widest px-2.5 py-1 rounded-full border ${c.bg} ${c.text} ${c.border}`}>
          {category || "Crypto"}
        </span>
        <div className="flex items-center gap-1.5">
          <span className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: "#00FF88", boxShadow: "0 0 5px #00FF88" }} />
          <Countdown endTime={Number(endTime)} />
        </div>
      </div>

      {/* Question */}
      <p className="flex-1 text-sm font-semibold text-white/85 leading-snug group-hover:text-white transition-colors">
        {question}
      </p>

      {/* Pool + bar */}
      <div className="space-y-2">
        <div className="flex justify-between items-center text-xs font-mono text-white/35">
          <span>Pool: <span className="text-white/60">${total.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span></span>
          <span className="text-[#00FF88]">Live</span>
        </div>
        <div className="h-1.5 w-full bg-white/8 rounded-full overflow-hidden flex gap-0.5">
          <div className="h-full rounded-l-full" style={{ width: `${yP}%`, background: "linear-gradient(90deg,#00FF88,#34d399)", boxShadow: "0 0 6px #00FF88" }} />
          <div className="h-full rounded-r-full" style={{ width: `${nP}%`, background: "linear-gradient(90deg,#f87171,#ef4444)" }} />
        </div>
      </div>

      {/* Buttons */}
      <div className="grid grid-cols-2 gap-2">
        <Link href={`/markets?id=${marketId}`}>
          <button className="w-full py-2 rounded-xl text-xs font-bold font-mono text-[#00FF88] bg-[#00FF88]/10 border border-[#00FF88]/20 hover:bg-[#00FF88]/18 hover:shadow-[0_0_16px_rgba(0,255,136,0.18)] transition-all duration-200">
            YES {yP}%
          </button>
        </Link>
        <Link href={`/markets?id=${marketId}`}>
          <button className="w-full py-2 rounded-xl text-xs font-bold font-mono text-red-400 bg-red-500/10 border border-red-500/20 hover:bg-red-500/18 hover:shadow-[0_0_16px_rgba(239,68,68,0.18)] transition-all duration-200">
            NO {nP}%
          </button>
        </Link>
      </div>
    </motion.div>
  );
}

export default function TrendingMarkets() {
  const contract = getPredictionMarketContract();
  const { data: nextMarketId } = useReadContract({
    contract: contract ?? undefined,
    method: "nextMarketId",
    params: [],
    queryOptions: { enabled: !!contract },
  } as any);

  const total = nextMarketId !== undefined ? Number(nextMarketId) : 0;
  const ids = Array.from({ length: Math.min(total, 6) }, (_, i) => total - 1 - i).filter(i => i >= 0);

  return (
    <section className="relative py-24 overflow-hidden">
      {/* Subtle section bg */}
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-transparent via-white/[0.012] to-transparent" />

      <div className="relative z-10 max-w-7xl mx-auto px-6 lg:px-8">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="flex items-end justify-between mb-10"
        >
          <div>
            <p className="text-[11px] font-mono uppercase tracking-widest text-purple-400 mb-2">Live Markets</p>
            <h2 className="text-3xl md:text-4xl font-bold font-display text-white">Trending Markets</h2>
          </div>
          <Link href="/markets">
            <button className="hidden md:flex items-center gap-1.5 text-xs font-mono text-white/30 hover:text-white transition-colors">
              VIEW ALL →
            </button>
          </Link>
        </motion.div>

        {/* Grid or empty state */}
        {ids.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {ids.map((id, i) => <Card key={id} marketId={id} index={i} />)}
          </div>
        ) : (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex flex-col items-center justify-center py-20 rounded-2xl border border-white/5 bg-white/[0.02]"
          >
            <div className="w-14 h-14 rounded-2xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center mb-4">
              <svg className="w-7 h-7 text-purple-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
              </svg>
            </div>
            <p className="text-sm text-white/30 font-mono">No active markets yet.</p>
            <p className="text-xs text-white/20 font-mono mt-1">Markets will appear here once deployed.</p>
          </motion.div>
        )}
      </div>
    </section>
  );
}
