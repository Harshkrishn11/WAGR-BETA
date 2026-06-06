"use client";
import React, { useEffect, useState } from "react";
import { motion } from "framer-motion";
import Link from "next/link";
import { useReadContract } from "thirdweb/react";
import { getPredictionMarketContract } from "@/lib/contracts";

const FLOAT_CARDS = [
  { question: "Will BTC hit $80k by EOY?",   tag: "Crypto", yes: 64, pos: "top-[18%] left-[3%]",  delay: 0   },
  { question: "ETH above $5k in Q4?",         tag: "Crypto", yes: 81, pos: "top-[22%] right-[3%]", delay: 1.5 },
  { question: "US Fed cut rates in Sept?",     tag: "Macro",  yes: 47, pos: "bottom-[22%] left-[3%]",delay: 0.8 },
  { question: "Base hits 1M daily txns?",      tag: "Base",   yes: 73, pos: "bottom-[22%] right-[3%]",delay: 2  },
];

function FloatingCard({ question, tag, yes, pos, delay }: (typeof FLOAT_CARDS)[0]) {
  return (
    <motion.div
      animate={{ y: [0, -12, 0] }}
      transition={{ duration: 6 + delay, repeat: Infinity, ease: "easeInOut", delay }}
      className={`absolute ${pos} w-48 xl:w-56 rounded-2xl border border-white/10 bg-white/[0.06] backdrop-blur-xl p-4 hidden lg:block`}
      style={{ boxShadow: "0 0 30px rgba(155,92,255,0.12)" }}
    >
      <span className="text-[9px] font-mono uppercase tracking-widest text-purple-300 bg-purple-500/10 px-2 py-0.5 rounded-full border border-purple-500/20">
        {tag}
      </span>
      <p className="mt-2 text-xs font-medium text-white/80 leading-snug">{question}</p>
      <div className="mt-3 flex items-center gap-2">
        <div className="flex-1 h-1 bg-white/10 rounded-full overflow-hidden">
          <div
            className="h-full rounded-full"
            style={{ width: `${yes}%`, background: "linear-gradient(90deg,#00FF88,#34d399)" }}
          />
        </div>
        <span className="text-[10px] text-[#00FF88] font-bold font-mono">{yes}%</span>
      </div>
    </motion.div>
  );
}

export default function Hero() {
  const contract = getPredictionMarketContract();
  const { data: nextMarketId } = useReadContract({
    contract: contract ?? undefined,
    method: "nextMarketId",
    params: [],
    queryOptions: { enabled: !!contract },
  } as any);
  const count = nextMarketId !== undefined ? Number(nextMarketId) : 0;

  return (
    <section className="relative min-h-[calc(100dvh-72px)] flex flex-col items-center justify-center overflow-hidden px-4">
      {/* Background blobs — contained within section */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute top-[20%] left-[30%] w-[500px] h-[400px] bg-purple-700/20 blur-[100px] rounded-full" />
        <div className="absolute bottom-[20%] right-[25%] w-[350px] h-[300px] bg-cyan-500/12 blur-[80px] rounded-full" />
        <div className="absolute top-[40%] left-[50%] w-[300px] h-[250px] bg-[#00FF88]/8 blur-[80px] rounded-full" />
        {/* Grid */}
        <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.018)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.018)_1px,transparent_1px)] bg-[size:60px_60px]" />
      </div>

      {/* Floating cards */}
      {FLOAT_CARDS.map((c) => <FloatingCard key={c.question} {...c} />)}

      {/* ——— Main centred content ——— */}
      <div className="relative z-10 flex flex-col items-center text-center max-w-4xl mx-auto py-12">
        {/* Live badge */}
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5 }}
          className="inline-flex items-center gap-2 mb-8 px-4 py-1.5 rounded-full border border-purple-500/30 bg-purple-500/10 backdrop-blur-sm"
        >
          <span className="w-2 h-2 rounded-full bg-[#00FF88] animate-pulse shadow-[0_0_6px_#00FF88]" />
          <span className="text-xs font-mono text-purple-300 tracking-widest uppercase">Live on Base Mainnet</span>
        </motion.div>

        {/* Headline */}
        <motion.h1
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7 }}
          className="text-5xl sm:text-6xl md:text-7xl xl:text-8xl font-bold font-display leading-[1.05] tracking-tight mb-6"
        >
          <span className="text-transparent bg-clip-text bg-gradient-to-br from-white via-purple-200 to-purple-400">
            Predict the Future.
          </span>
          <br />
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#00D4FF] via-white to-[#00FF88]">
            Trade on Reality.
          </span>
        </motion.h1>

        {/* Sub */}
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3, duration: 0.7 }}
          className="text-base md:text-lg text-white/45 max-w-xl mx-auto leading-relaxed mb-10"
        >
          The Bloomberg Terminal of on-chain prediction markets — where every trade is trustless, every payout is instant, and every outcome is verifiable.
        </motion.p>

        {/* CTAs */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="flex flex-col sm:flex-row items-center gap-3 mb-12"
        >
          <Link href="/markets">
            <button className="group relative px-8 py-3.5 rounded-2xl font-bold text-sm font-display uppercase tracking-wider text-white bg-gradient-to-r from-purple-600 to-violet-600 shadow-[0_0_28px_rgba(139,92,246,0.45)] hover:shadow-[0_0_44px_rgba(139,92,246,0.7)] hover:-translate-y-0.5 transition-all duration-300">
              Explore Markets →
            </button>
          </Link>
          <Link href="/game">
            <button className="px-8 py-3.5 rounded-2xl font-bold text-sm font-display uppercase tracking-wider text-white/60 border border-white/10 bg-white/[0.04] hover:bg-white/[0.08] hover:text-white hover:-translate-y-0.5 transition-all duration-300">
              Play Daily Game
            </button>
          </Link>
        </motion.div>

        {/* Stats ticker */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.8 }}
          className="flex flex-wrap justify-center items-center gap-6 px-6 py-3 rounded-2xl border border-white/8 bg-white/[0.04] backdrop-blur-xl"
        >
          {[
            { label: "Total Volume", value: "$1.2M+" },
            { label: "Active Markets", value: String(count) },
            { label: "Auto-Payouts", value: "100%" },
            { label: "Built on Base", value: "On-Chain ⛓" },
          ].map((s) => (
            <div key={s.label} className="flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-[#00FF88] shadow-[0_0_6px_#00FF88] animate-pulse" />
              <span className="text-xs text-white/40 font-mono">{s.label}:</span>
              <span className="text-xs font-bold text-white font-mono">{s.value}</span>
            </div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}
