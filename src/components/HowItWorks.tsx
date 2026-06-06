"use client";
import React from "react";
import { motion } from "framer-motion";
import { Wallet, TrendingUp, Zap } from "lucide-react";

const STEPS = [
  {
    Icon: Wallet,
    num: "01",
    title: "Connect Wallet",
    desc: "Deposit USDC on Base. Zero gas fees, instant settlement. 100% non-custodial — your keys, your funds, always.",
    color: "#9B5CFF",
  },
  {
    Icon: TrendingUp,
    num: "02",
    title: "Buy Outcome Shares",
    desc: "Trade YES or NO on any market. Prices move $0.01–$0.99 based on crowd conviction. The market IS the oracle.",
    color: "#00D4FF",
  },
  {
    Icon: Zap,
    num: "03",
    title: "Instant Smart Contract Payouts",
    desc: "When markets resolve, smart contracts auto-distribute winnings. No waiting. No trust needed. Pure math.",
    color: "#00FF88",
  },
];

export default function HowItWorks() {
  return (
    <section className="relative py-24 overflow-hidden">
      {/* Distinct section background */}
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-white/[0.012] via-white/[0.025] to-white/[0.012]" />
      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.015)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.015)_1px,transparent_1px)] bg-[size:60px_60px]" />
      {/* Top and bottom borders for section separation */}
      <div className="pointer-events-none absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />
      <div className="pointer-events-none absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />

      <div className="relative z-10 max-w-7xl mx-auto px-6 lg:px-8">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-16"
        >
          <p className="text-[11px] font-mono uppercase tracking-widest text-cyan-400 mb-3">Simple Process</p>
          <h2 className="text-3xl md:text-4xl font-bold font-display text-white mb-3">How It Works</h2>
          <p className="text-sm text-white/35 max-w-md mx-auto leading-relaxed">
            No middlemen. No limits. No trust required. Pure on-chain truth.
          </p>
        </motion.div>

        {/* Steps grid */}
        <div className="relative grid grid-cols-1 md:grid-cols-3 gap-6 md:gap-8">
          {/* Desktop connecting line */}
          <div className="hidden md:block absolute top-[3.25rem] left-[16.67%] right-[16.67%] h-px">
            <div className="w-full h-full bg-gradient-to-r from-purple-500/40 via-cyan-500/40 to-emerald-500/40" />
          </div>

          {STEPS.map((step, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.15 }}
              className="group flex flex-col items-center text-center"
            >
              {/* Icon */}
              <div className="relative mb-6">
                <div
                  className="relative w-[6.5rem] h-[6.5rem] rounded-3xl flex items-center justify-center border transition-all duration-300 group-hover:scale-105"
                  style={{
                    background: `${step.color}12`,
                    borderColor: `${step.color}30`,
                    boxShadow: `0 0 0 rgba(0,0,0,0)`,
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.boxShadow = `0 0 32px ${step.color}30`)}
                  onMouseLeave={(e) => (e.currentTarget.style.boxShadow = `0 0 0 rgba(0,0,0,0)`)}
                >
                  {/* Step badge */}
                  <div
                    className="absolute -top-2.5 -right-2.5 w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold font-mono border border-white/10"
                    style={{ color: step.color, background: "#0B0B13" }}
                  >
                    {step.num}
                  </div>
                  <step.Icon
                    size={34}
                    style={{ color: step.color, filter: `drop-shadow(0 0 10px ${step.color}60)` }}
                  />
                </div>
              </div>

              <h3 className="text-base font-bold font-display text-white mb-2">{step.title}</h3>
              <p className="text-xs text-white/40 leading-relaxed max-w-[260px]">{step.desc}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
