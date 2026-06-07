"use client";

import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useReadContract } from "thirdweb/react";
import { getPredictionMarketContract } from "@/lib/contracts";
import { ArrowRight, Shield, BarChart3, Globe, TrendingUp, Users, Zap, Link2, Target, Clock } from "lucide-react";
import Footer from "@/components/Footer";

/* ─── Helpers ─────────────────────────────────────────────────── */
const W = (children: React.ReactNode, maxW = 1200) => (
  <div style={{ maxWidth: maxW, margin: "0 auto", padding: "0 24px", width: "100%" }}>{children}</div>
);

const fadeUp = { initial: { opacity: 0, y: 24 }, animate: { opacity: 1, y: 0 } };

const CATCLR: Record<string, string> = {
  Crypto: "#7C3AED", Politics: "#2563EB", Sports: "#0891B2",
  Tech: "#059669", Macro: "#D97706", Entertainment: "#DC2626", Science: "#7C3AED", Others: "#6B7280"
};

/* ─── Countdown ────────────────────────────────────────────────── */
function Countdown({ endTime }: { endTime: number }) {
  const [t, setT] = useState({ h: 0, m: 0, s: 0 });
  useEffect(() => {
    const c = () => {
      const d = Math.max(0, endTime - Math.floor(Date.now() / 1000));
      setT({ h: Math.floor(d / 3600), m: Math.floor((d % 3600) / 60), s: d % 60 });
    };
    c(); const id = setInterval(c, 1000); return () => clearInterval(id);
  }, [endTime]);
  const f = (n: number) => String(n).padStart(2, "0");
  return (
    <span style={{ fontFamily: "monospace", fontSize: 11, color: "#6B7280", background: "rgba(255,255,255,0.05)", padding: "2px 8px", borderRadius: 6, border: "1px solid rgba(255,255,255,0.08)" }}>
      {f(t.h)}:{f(t.m)}:{f(t.s)}
    </span>
  );
}

/* ─── Market Card ──────────────────────────────────────────────── */
function MarketCard({ marketId, index }: { marketId: number; index: number }) {
  const contract = getPredictionMarketContract();
  const { data, isLoading } = useReadContract({ contract: contract ?? undefined, method: "getMarket", params: [BigInt(marketId)], queryOptions: { enabled: !!contract } } as any);
  const { data: yesPool } = useReadContract({ contract: contract ?? undefined, method: "getOptionPool", params: [BigInt(marketId), 0], queryOptions: { enabled: !!contract } } as any);
  const { data: noPool } = useReadContract({ contract: contract ?? undefined, method: "getOptionPool", params: [BigInt(marketId), 1], queryOptions: { enabled: !!contract } } as any);
  const router = useRouter();

  if (isLoading) return <div style={{ height: 200, borderRadius: 16, background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)", animation: "pulse 2s infinite" }} />;
  if (!data) return null;

  const { question, category, deadline: endTime, status, totalPool } = data as any;
  if (Number(status) === 3) return null;

  const yes = Number(yesPool ?? 0n), no = Number(noPool ?? 0n), sum = yes + no;
  const yP = sum > 0 ? Math.round((yes / sum) * 100) : 50;
  const total = Number(totalPool) / 1e6;
  const clr = CATCLR[category] ?? "#7C3AED";
  const isActive = Number(status) === 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.5, delay: index * 0.06 }}
      onClick={() => router.push(`/markets/${marketId}`)}
      style={{
        borderRadius: 16,
        background: "rgba(255,255,255,0.03)",
        border: "1px solid rgba(255,255,255,0.08)",
        padding: 24,
        display: "flex",
        flexDirection: "column",
        gap: 16,
        cursor: "pointer",
        transition: "border-color 0.2s, background 0.2s",
      }}
      whileHover={{ scale: 1.01, transition: { duration: 0.15 } }}
      onMouseEnter={e => {
        (e.currentTarget as HTMLElement).style.borderColor = "rgba(124,58,237,0.4)";
        (e.currentTarget as HTMLElement).style.background = "rgba(124,58,237,0.04)";
      }}
      onMouseLeave={e => {
        (e.currentTarget as HTMLElement).style.borderColor = "rgba(255,255,255,0.08)";
        (e.currentTarget as HTMLElement).style.background = "rgba(255,255,255,0.03)";
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <span style={{ fontSize: 11, fontWeight: 600, letterSpacing: "0.06em", textTransform: "uppercase", padding: "3px 10px", borderRadius: 6, background: `${clr}15`, color: clr, border: `1px solid ${clr}30` }}>{category || "Crypto"}</span>
        {isActive ? <Countdown endTime={Number(endTime)} /> : <span style={{ fontSize: 10, color: "#6B7280", fontFamily: "monospace" }}>SETTLED</span>}
      </div>

      <p style={{ fontSize: 15, fontWeight: 500, color: "rgba(255,255,255,0.85)", lineHeight: 1.6, margin: 0 }}>{question}</p>

      <div>
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
          <span style={{ fontSize: 12, fontWeight: 600, color: "#10B981" }}>YES {yP}%</span>
          <span style={{ fontSize: 12, fontWeight: 600, color: "#EF4444" }}>NO {100 - yP}%</span>
        </div>
        <div style={{ height: 4, background: "rgba(255,255,255,0.06)", borderRadius: 99, overflow: "hidden", display: "flex" }}>
          <div style={{ width: `${yP}%`, background: "#10B981", transition: "width 0.8s ease" }} />
          <div style={{ width: `${100 - yP}%`, background: "#EF4444" }} />
        </div>
      </div>

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <span style={{ fontSize: 12, color: "#6B7280" }}>Pool: <strong style={{ color: "rgba(255,255,255,0.6)" }}>${total.toLocaleString("en-US", { maximumFractionDigits: 2 })}</strong></span>
        <span style={{ fontSize: 12, fontWeight: 600, color: "#7C3AED", display: "flex", alignItems: "center", gap: 4 }}>Predict <ArrowRight size={11} /></span>
      </div>
    </motion.div>
  );
}

/* ─── Live Ticker ──────────────────────────────────────────────── */
const TICKERS = [
  { q: "Will BTC hit $150k in 2025?", yes: 74 }, { q: "ETH ETF approved?", yes: 58 },
  { q: "India wins T20 World Cup?", yes: 41 }, { q: "Tesla $500 by Dec?", yes: 33 },
  { q: "Fed cuts rates in Sep?", yes: 67 }, { q: "GPT-5 released in 2025?", yes: 82 },
];

function LiveTicker() {
  const all = [...TICKERS, ...TICKERS, ...TICKERS];
  return (
    <div style={{ overflow: "hidden", position: "relative", borderTop: "1px solid rgba(255,255,255,0.06)", borderBottom: "1px solid rgba(255,255,255,0.06)", background: "rgba(0,0,0,0.3)", padding: "10px 0" }}>
      <div style={{ position: "absolute", left: 0, top: 0, bottom: 0, width: 80, background: "linear-gradient(90deg,#06060F,transparent)", zIndex: 2, pointerEvents: "none" }} />
      <div style={{ position: "absolute", right: 0, top: 0, bottom: 0, width: 80, background: "linear-gradient(-90deg,#06060F,transparent)", zIndex: 2, pointerEvents: "none" }} />
      <motion.div animate={{ x: ["0%", "-33.33%"] }} transition={{ duration: 50, repeat: Infinity, ease: "linear" }}
        style={{ display: "flex", alignItems: "center", whiteSpace: "nowrap" }}>
        {all.map((t, i) => {
          const clr = t.yes >= 50 ? "#10B981" : "#EF4444";
          return (
            <div key={i} style={{ display: "inline-flex", alignItems: "center", gap: 10, padding: "0 32px", borderRight: "1px solid rgba(255,255,255,0.05)" }}>
              <span style={{ width: 5, height: 5, borderRadius: "50%", background: clr, display: "block", flexShrink: 0 }} />
              <span style={{ fontSize: 12, color: "rgba(255,255,255,0.4)", fontFamily: "monospace" }}>{t.q}</span>
              <span style={{ fontSize: 12, fontWeight: 700, color: clr, fontFamily: "monospace" }}>{t.yes}%</span>
            </div>
          );
        })}
      </motion.div>
    </div>
  );
}

/* ─── Hero ─────────────────────────────────────────────────────── */
function Hero() {
  const contract = getPredictionMarketContract();
  const { data: nextMarketId } = useReadContract({ contract: contract ?? undefined, method: "nextMarketId", params: [], queryOptions: { enabled: !!contract } } as any);
  const count = nextMarketId !== undefined ? Number(nextMarketId) : 0;

  return (
    <section style={{ position: "relative", minHeight: "90vh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "120px 0 60px", overflow: "hidden" }}>
      {/* Subtle single gradient blob — no animation */}
      <div style={{ position: "absolute", top: "10%", left: "50%", transform: "translateX(-50%)", width: 800, height: 500, background: "radial-gradient(ellipse, rgba(124,58,237,0.12) 0%, transparent 70%)", pointerEvents: "none", filter: "blur(40px)" }} />

      {W(
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center", position: "relative", zIndex: 2 }}>

          {/* Status badge */}
          <motion.div {...fadeUp} transition={{ duration: 0.5 }}
            style={{ display: "inline-flex", alignItems: "center", gap: 8, marginBottom: 32, padding: "6px 16px", borderRadius: 999, background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.1)" }}>
            <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#10B981", display: "block" }} />
            <span style={{ fontSize: 12, fontFamily: "monospace", letterSpacing: "0.1em", textTransform: "uppercase", color: "rgba(255,255,255,0.5)", fontWeight: 600 }}>Live · Base Testnet</span>
          </motion.div>

          {/* Headline */}
          <motion.h1 {...fadeUp} transition={{ duration: 0.6, delay: 0.1 }}
            style={{ fontSize: "clamp(2.8rem,8vw,6rem)", fontWeight: 800, lineHeight: 1.1, letterSpacing: "-0.04em", fontFamily: "var(--font-space-grotesk,sans-serif)", margin: "0 0 20px", color: "#fff" }}>
            Predict Markets.<br />
            <span style={{ color: "#7C3AED" }}>Win Real Rewards.</span>
          </motion.h1>

          {/* Subheadline */}
          <motion.p {...fadeUp} transition={{ duration: 0.6, delay: 0.2 }}
            style={{ fontSize: "clamp(1rem,2vw,1.2rem)", color: "rgba(255,255,255,0.4)", maxWidth: 520, lineHeight: 1.8, margin: "0 0 48px" }}>
            Put your conviction on-chain. Create markets, place predictions, and get paid automatically when you're right.
          </motion.p>

          {/* CTA Buttons */}
          <motion.div {...fadeUp} transition={{ duration: 0.6, delay: 0.3 }}
            style={{ display: "flex", gap: 12, flexWrap: "wrap", justifyContent: "center", marginBottom: 64 }}>
            <Link href="/markets">
              <button style={{
                padding: "14px 32px", borderRadius: 12, fontWeight: 700, fontSize: 15, color: "#fff", border: "none", cursor: "pointer",
                background: "#7C3AED", fontFamily: "var(--font-space-grotesk,sans-serif)",
                display: "flex", alignItems: "center", gap: 8, transition: "background 0.2s, transform 0.15s"
              }}
                onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = "#6D28D9"; }}
                onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = "#7C3AED"; }}>
                Start Predicting <ArrowRight size={16} />
              </button>
            </Link>
            <Link href="/create">
              <button style={{
                padding: "14px 32px", borderRadius: 12, fontWeight: 600, fontSize: 15,
                color: "rgba(255,255,255,0.65)", background: "rgba(255,255,255,0.05)",
                border: "1px solid rgba(255,255,255,0.12)", cursor: "pointer", transition: "all 0.2s"
              }}
                onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = "rgba(124,58,237,0.4)"; (e.currentTarget as HTMLElement).style.color = "#fff"; }}
                onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = "rgba(255,255,255,0.12)"; (e.currentTarget as HTMLElement).style.color = "rgba(255,255,255,0.65)"; }}>
                Create Market
              </button>
            </Link>
          </motion.div>

          {/* Stats */}
          <motion.div {...fadeUp} transition={{ duration: 0.6, delay: 0.4 }}>
            <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "center", gap: 1, borderRadius: 16, overflow: "hidden", border: "1px solid rgba(255,255,255,0.07)", background: "rgba(255,255,255,0.02)" }}>
              {[
                { label: "Markets Live", value: String(count), color: "#7C3AED" },
                { label: "Auto-Payouts", value: "100%", color: "#10B981" },
                { label: "Platform Fee", value: "1%", color: "rgba(255,255,255,0.7)" },
                { label: "Network", value: "Base", color: "#2563EB" },
              ].map((s, i, arr) => (
                <React.Fragment key={s.label}>
                  <div style={{ padding: "20px 32px", display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
                    <span style={{ fontSize: 24, fontWeight: 800, fontFamily: "monospace", color: s.color }}>{s.value}</span>
                    <span style={{ fontSize: 10, fontFamily: "monospace", color: "rgba(255,255,255,0.3)", textTransform: "uppercase", letterSpacing: "0.1em" }}>{s.label}</span>
                  </div>
                  {i < arr.length - 1 && <div style={{ width: 1, background: "rgba(255,255,255,0.06)", alignSelf: "stretch" }} />}
                </React.Fragment>
              ))}
            </div>
          </motion.div>
        </div>
      )}
    </section>
  );
}

/* ─── Trending Markets ─────────────────────────────────────────── */
function TrendingMarkets() {
  const contract = getPredictionMarketContract();
  const { data: nextMarketId } = useReadContract({ contract: contract ?? undefined, method: "nextMarketId", params: [], queryOptions: { enabled: !!contract } } as any);
  const total = nextMarketId !== undefined ? Number(nextMarketId) : 0;
  const ids = Array.from({ length: Math.min(total, 6) }, (_, i) => total - 1 - i).filter(i => i >= 0);

  return (
    <section style={{ padding: "80px 0", position: "relative", zIndex: 1 }}>
      {W(<>
        <motion.div {...fadeUp} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.6 }}
          style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginBottom: 40, flexWrap: "wrap", gap: 16 }}>
          <div>
            <p style={{ fontSize: 12, fontFamily: "monospace", letterSpacing: "0.1em", textTransform: "uppercase", color: "#7C3AED", fontWeight: 700, marginBottom: 8 }}>Live Markets</p>
            <h2 style={{ fontSize: "clamp(1.8rem,4vw,2.8rem)", fontWeight: 800, color: "#fff", margin: 0, fontFamily: "var(--font-space-grotesk,sans-serif)", letterSpacing: "-0.03em" }}>
              Trending Now
            </h2>
          </div>
          <Link href="/markets">
            <button style={{ padding: "9px 20px", borderRadius: 10, fontWeight: 600, fontSize: 13, color: "#7C3AED", background: "rgba(124,58,237,0.08)", border: "1px solid rgba(124,58,237,0.25)", cursor: "pointer", display: "flex", alignItems: "center", gap: 6, transition: "all 0.2s" }}
              onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = "rgba(124,58,237,0.14)"; }}
              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = "rgba(124,58,237,0.08)"; }}>
              All Markets <ArrowRight size={13} />
            </button>
          </Link>
        </motion.div>

        {ids.length > 0 ? (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(min(100%,320px),1fr))", gap: 16 }}>
            {ids.map((id, i) => <MarketCard key={id} marketId={id} index={i} />)}
          </div>
        ) : (
          <div style={{ textAlign: "center", padding: "60px 0", borderRadius: 16, border: "1px solid rgba(255,255,255,0.06)", background: "rgba(255,255,255,0.02)" }}>
            <p style={{ color: "rgba(255,255,255,0.3)", fontFamily: "monospace", fontSize: 13 }}>No markets yet. Be the first to create one.</p>
          </div>
        )}
      </>)}
    </section>
  );
}

/* ─── How It Works ─────────────────────────────────────────────── */
const STEPS = [
  { num: "01", Icon: Link2, title: "Connect Wallet", desc: "Link MetaMask or any Web3 wallet. Zero sign-up, zero KYC. Always non-custodial.", color: "#7C3AED" },
  { num: "02", Icon: Target, title: "Pick Your Side", desc: "YES or NO on any market. Live odds shift as the crowd bets. The smarter you are, the more you win.", color: "#2563EB" },
  { num: "03", Icon: Zap, title: "Win Instantly", desc: "Smart contracts auto-pay the moment a market resolves. No waiting. Pure math, no trust.", color: "#10B981" },
];

function HowItWorks() {
  return (
    <section style={{ padding: "80px 0", position: "relative", zIndex: 1, borderTop: "1px solid rgba(255,255,255,0.05)" }}>
      {W(<>
        <motion.div {...fadeUp} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.6 }}
          style={{ textAlign: "center", marginBottom: 56 }}>
          <p style={{ fontSize: 12, fontFamily: "monospace", letterSpacing: "0.1em", textTransform: "uppercase", color: "#7C3AED", fontWeight: 700, marginBottom: 12 }}>How It Works</p>
          <h2 style={{ fontSize: "clamp(1.8rem,4vw,2.8rem)", fontWeight: 800, color: "#fff", margin: "0 0 12px", fontFamily: "var(--font-space-grotesk,sans-serif)", letterSpacing: "-0.03em" }}>
            Three Steps to Win
          </h2>
          <p style={{ fontSize: 15, color: "rgba(255,255,255,0.35)", maxWidth: 380, margin: "0 auto" }}>No middlemen. No trust. Pure math.</p>
        </motion.div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(min(100%,280px),1fr))", gap: 20 }}>
          {STEPS.map((s, i) => (
            <motion.div key={i} {...fadeUp} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.5, delay: i * 0.1 }}
              style={{ padding: 28, borderRadius: 16, background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.07)", position: "relative" }}>
              <div style={{ position: "absolute", top: 20, right: 20, fontSize: 32, fontWeight: 900, fontFamily: "monospace", color: "rgba(255,255,255,0.04)" }}>{s.num}</div>
              <div style={{ width: 44, height: 44, borderRadius: 12, background: `${s.color}14`, border: `1px solid ${s.color}28`, display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 18 }}>
                <s.Icon size={20} color={s.color} />
              </div>
              <h3 style={{ fontSize: 17, fontWeight: 700, color: "#fff", margin: "0 0 10px", fontFamily: "var(--font-space-grotesk,sans-serif)" }}>{s.title}</h3>
              <p style={{ fontSize: 14, color: "rgba(255,255,255,0.4)", lineHeight: 1.7, margin: 0 }}>{s.desc}</p>
              <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, height: 2, background: s.color, borderRadius: "0 0 16px 16px", opacity: 0.5 }} />
            </motion.div>
          ))}
        </div>
      </>)}
    </section>
  );
}

/* ─── Features ─────────────────────────────────────────────────── */
const FEATS = [
  { Icon: Shield, title: "100% On-Chain", desc: "Every bet and payout on Base. Immutable, auditable, forever." },
  { Icon: Zap, title: "Instant Payouts", desc: "Smart contracts auto-distribute winnings the moment a market resolves." },
  { Icon: BarChart3, title: "No House Edge", desc: "Pari-mutuel math. Winners split the full loser pool. The math never lies." },
  { Icon: Shield, title: "Non-Custodial", desc: "Your USDC stays in your wallet until you bet. We can never touch it." },
  { Icon: Globe, title: "Open to All", desc: "Anyone, anywhere, anytime. A truly open financial prediction protocol." },
  { Icon: Users, title: "Friend Bets", desc: "Challenge friends to custom 1v1 bets. You set the terms, judge decides." },
];

function Features() {
  return (
    <section style={{ padding: "80px 0", position: "relative", zIndex: 1, borderTop: "1px solid rgba(255,255,255,0.05)" }}>
      {W(<>
        <motion.div {...fadeUp} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.6 }}
          style={{ textAlign: "center", marginBottom: 56 }}>
          <p style={{ fontSize: 12, fontFamily: "monospace", letterSpacing: "0.1em", textTransform: "uppercase", color: "#7C3AED", fontWeight: 700, marginBottom: 12 }}>Why WAGR</p>
          <h2 style={{ fontSize: "clamp(1.8rem,4vw,2.8rem)", fontWeight: 800, color: "#fff", margin: "0 0 12px", fontFamily: "var(--font-space-grotesk,sans-serif)", letterSpacing: "-0.03em" }}>
            Built Different
          </h2>
          <p style={{ fontSize: 15, color: "rgba(255,255,255,0.35)", maxWidth: 380, margin: "0 auto" }}>Every feature designed to eliminate trust and maximize fairness.</p>
        </motion.div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(min(100%,280px),1fr))", gap: 16 }}>
          {FEATS.map((f, i) => (
            <motion.div key={i} {...fadeUp} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.5, delay: i * 0.07 }}
              style={{ padding: 24, borderRadius: 16, background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.07)", display: "flex", flexDirection: "column", gap: 14, transition: "border-color 0.2s" }}
              onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = "rgba(124,58,237,0.3)"; }}
              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = "rgba(255,255,255,0.07)"; }}>
              <div style={{ width: 40, height: 40, borderRadius: 10, background: "rgba(124,58,237,0.1)", border: "1px solid rgba(124,58,237,0.2)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <f.Icon size={18} color="#7C3AED" />
              </div>
              <div>
                <h3 style={{ fontSize: 15, fontWeight: 700, color: "#fff", margin: "0 0 6px", fontFamily: "var(--font-space-grotesk,sans-serif)" }}>{f.title}</h3>
                <p style={{ fontSize: 13, color: "rgba(255,255,255,0.4)", lineHeight: 1.7, margin: 0 }}>{f.desc}</p>
              </div>
            </motion.div>
          ))}
        </div>
      </>)}
    </section>
  );
}

/* ─── CTA ──────────────────────────────────────────────────────── */
function CTA() {
  return (
    <section style={{ padding: "80px 0 120px", position: "relative", zIndex: 1, borderTop: "1px solid rgba(255,255,255,0.05)" }}>
      {W(
        <motion.div {...fadeUp} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.6 }}
          style={{ padding: "64px 40px", borderRadius: 24, textAlign: "center", position: "relative", overflow: "hidden", background: "rgba(124,58,237,0.06)", border: "1px solid rgba(124,58,237,0.2)" }}>
          <div style={{ position: "absolute", inset: 0, background: "radial-gradient(ellipse 60% 60% at 50% 0%, rgba(124,58,237,0.12), transparent)", pointerEvents: "none" }} />
          <div style={{ position: "relative" }}>
            <div style={{ width: 56, height: 56, borderRadius: 16, background: "rgba(124,58,237,0.15)", border: "1px solid rgba(124,58,237,0.3)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 24px" }}>
              <TrendingUp size={24} color="#7C3AED" />
            </div>
            <h2 style={{ fontSize: "clamp(1.8rem,4vw,2.8rem)", fontWeight: 800, color: "#fff", margin: "0 0 14px", fontFamily: "var(--font-space-grotesk,sans-serif)", letterSpacing: "-0.03em" }}>
              Ready to predict the future?
            </h2>
            <p style={{ fontSize: 16, color: "rgba(255,255,255,0.4)", maxWidth: 440, margin: "0 auto 36px", lineHeight: 1.7 }}>
              Join WAGR and put money behind your convictions. The smarter you predict, the more you earn.
            </p>
            <div style={{ display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap" }}>
              <Link href="/markets">
                <button style={{ padding: "14px 32px", borderRadius: 12, fontWeight: 700, fontSize: 15, color: "#fff", border: "none", cursor: "pointer", background: "#7C3AED", display: "flex", alignItems: "center", gap: 8, transition: "background 0.2s" }}
                  onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = "#6D28D9"; }}
                  onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = "#7C3AED"; }}>
                  Explore Markets <ArrowRight size={16} />
                </button>
              </Link>
              <Link href="/bet/create">
                <button style={{ padding: "14px 32px", borderRadius: 12, fontWeight: 600, fontSize: 15, color: "rgba(255,255,255,0.6)", background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.12)", cursor: "pointer", transition: "all 0.2s" }}
                  onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = "#fff"; (e.currentTarget as HTMLElement).style.borderColor = "rgba(124,58,237,0.4)"; }}
                  onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = "rgba(255,255,255,0.6)"; (e.currentTarget as HTMLElement).style.borderColor = "rgba(255,255,255,0.12)"; }}>
                  Bet a Friend
                </button>
              </Link>
            </div>
          </div>
        </motion.div>
      )}
    </section>
  );
}

/* ─── Page ─────────────────────────────────────────────────────── */
export default function Home() {
  return (
    <>
      {/* Clean single-tone background — no animated blobs */}
      <div style={{ position: "fixed", inset: 0, zIndex: 0, background: "#06060F", pointerEvents: "none" }}>
        <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: "50vh", background: "radial-gradient(ellipse 80% 50% at 50% 0%, rgba(124,58,237,0.08) 0%, transparent 100%)" }} />
      </div>

      <div style={{ position: "relative", zIndex: 1 }}>
        <Hero />
        <LiveTicker />
        <TrendingMarkets />
        <HowItWorks />
        <Features />
        <CTA />
        <Footer />
      </div>

      <style>{`
        @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.4} }
        html, body { overflow-x: hidden; }
        @media(max-width:768px){
          section { padding-top:56px !important; padding-bottom:56px !important; }
        }
        @media(max-width:480px){
          section { padding-top:40px !important; padding-bottom:40px !important; }
        }
        @media(hover: none) and (pointer: coarse) {
          button, a { min-height: 44px; }
        }
        * { -webkit-tap-highlight-color: transparent; }
      `}</style>
    </>
  );
}
