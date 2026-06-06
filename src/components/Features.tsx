"use client";
import React from "react";
import { motion } from "framer-motion";
import { ShieldCheck, BarChart2, Globe, Lock, Cpu, Zap } from "lucide-react";

const FEATURES = [
  { Icon: ShieldCheck, title: "100% On-Chain",           desc: "Every bet and payout lives on the Base blockchain. Immutable, auditable, forever.", color: "#9B5CFF" },
  { Icon: BarChart2,  title: "Pari-Mutuel Math",          desc: "Fair odds by the crowd. No house edge. Winners share the loser pool.", color: "#00D4FF" },
  { Icon: Globe,      title: "Decentralized Oracles",     desc: "Outcomes resolved by on-chain data. No central authority can manipulate results.", color: "#00FF88" },
  { Icon: Zap,        title: "Instant Payouts",           desc: "Smart contracts auto-distribute winnings the moment a market resolves.", color: "#FFB800" },
  { Icon: Lock,       title: "Non-Custodial",             desc: "Your USDC never leaves your wallet until you bet. We never hold your funds.", color: "#FF6B6B" },
  { Icon: Cpu,        title: "Audited Contracts",         desc: "Open-source and audited. Verify every line of code on BaseScan yourself.", color: "#B8FF6B" },
];

export default function Features() {
  return (
    <section className="relative py-24 overflow-hidden">
      {/* Contained ambient glow */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[300px] bg-purple-700/8 blur-[90px] rounded-full" />
      </div>
      {/* Top border */}
      <div className="pointer-events-none absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />

      <div className="relative z-10 max-w-7xl mx-auto px-6 lg:px-8">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-12"
        >
          <p className="text-[11px] font-mono uppercase tracking-widest text-emerald-400 mb-3">Why WAGR</p>
          <h2 className="text-3xl md:text-4xl font-bold font-display text-white mb-3">Built for Trust</h2>
          <p className="text-sm text-white/35 max-w-md mx-auto">
            Every feature designed to eliminate trust from the equation.
          </p>
        </motion.div>

        {/* Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {FEATURES.map((f, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.07 }}
              whileHover={{ y: -3 }}
              className="group relative p-5 rounded-2xl border border-white/6 bg-white/[0.03] backdrop-blur-sm overflow-hidden hover:border-white/12 transition-all duration-300"
            >
              <div className="flex items-start gap-4">
                {/* Icon with live pulse */}
                <div className="relative flex-shrink-0">
                  <span
                    className="absolute -top-1 -right-1 w-2 h-2 rounded-full animate-ping"
                    style={{ background: f.color, opacity: 0.6 }}
                  />
                  <span
                    className="absolute -top-1 -right-1 w-2 h-2 rounded-full"
                    style={{ background: f.color, boxShadow: `0 0 6px ${f.color}` }}
                  />
                  <div
                    className="w-10 h-10 rounded-xl flex items-center justify-center"
                    style={{ background: `${f.color}15`, border: `1px solid ${f.color}25` }}
                  >
                    <f.Icon size={18} style={{ color: f.color, filter: `drop-shadow(0 0 6px ${f.color}80)` }} />
                  </div>
                </div>
                <div>
                  <h3 className="text-sm font-bold font-display text-white mb-1">{f.title}</h3>
                  <p className="text-xs text-white/38 leading-relaxed">{f.desc}</p>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
