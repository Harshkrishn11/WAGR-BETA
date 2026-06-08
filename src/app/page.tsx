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
    <span style={{ fontFamily: "monospace", fontSize: 11, color: "#6B7280", background: "rgba(0,0,0,0.04)", padding: "2px 8px", borderRadius: 6, border: "1px solid rgba(0,0,0,0.08)" }}>
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

  if (isLoading) return <div style={{ height: 200, borderRadius: 16, background: "#f9fafb", border: "1px solid rgba(0,0,0,0.06)", animation: "pulse 2s infinite" }} />;
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
        background: "#ffffff",
        border: "1px solid rgba(0,0,0,0.08)",
        padding: 24,
        display: "flex",
        flexDirection: "column",
        gap: 16,
        cursor: "pointer",
        transition: "border-color 0.2s, background 0.2s, box-shadow 0.2s",
        boxShadow: "0 1px 4px rgba(0,0,0,0.06)",
      }}
      whileHover={{ scale: 1.01, transition: { duration: 0.15 } }}
      onMouseEnter={e => {
        (e.currentTarget as HTMLElement).style.borderColor = "rgba(124,58,237,0.4)";
        (e.currentTarget as HTMLElement).style.background = "rgba(124,58,237,0.02)";
        (e.currentTarget as HTMLElement).style.boxShadow = "0 4px 16px rgba(124,58,237,0.12)";
      }}
      onMouseLeave={e => {
        (e.currentTarget as HTMLElement).style.borderColor = "rgba(0,0,0,0.08)";
        (e.currentTarget as HTMLElement).style.background = "#ffffff";
        (e.currentTarget as HTMLElement).style.boxShadow = "0 1px 4px rgba(0,0,0,0.06)";
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <span style={{ fontSize: 11, fontWeight: 600, letterSpacing: "0.06em", textTransform: "uppercase", padding: "3px 10px", borderRadius: 6, background: `${clr}15`, color: clr, border: `1px solid ${clr}30` }}>{category || "Crypto"}</span>
        {isActive ? <Countdown endTime={Number(endTime)} /> : <span style={{ fontSize: 10, color: "#6B7280", fontFamily: "monospace" }}>SETTLED</span>}
      </div>

      <p style={{ fontSize: 15, fontWeight: 500, color: "#111827", lineHeight: 1.6, margin: 0 }}>{question}</p>

      <div>
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
          <span style={{ fontSize: 12, fontWeight: 600, color: "#10B981" }}>YES {yP}%</span>
          <span style={{ fontSize: 12, fontWeight: 600, color: "#EF4444" }}>NO {100 - yP}%</span>
        </div>
        <div style={{ height: 4, background: "rgba(0,0,0,0.06)", borderRadius: 99, overflow: "hidden", display: "flex" }}>
          <div style={{ width: `${yP}%`, background: "#10B981", transition: "width 0.8s ease" }} />
          <div style={{ width: `${100 - yP}%`, background: "#EF4444" }} />
        </div>
      </div>

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <span style={{ fontSize: 12, color: "#6B7280" }}>Pool: <strong style={{ color: "#111827" }}>${total.toLocaleString("en-US", { maximumFractionDigits: 2 })}</strong></span>
        <span style={{ fontSize: 12, fontWeight: 600, color: "#7C3AED", display: "flex", alignItems: "center", gap: 4 }}>Predict <ArrowRight size={11} /></span>
      </div>
    </motion.div>
  );
}

/* ─── Hero ─────────────────────────────────────────────────────── */
function Hero() {
  const contract = getPredictionMarketContract();
  const { data: nextMarketId } = useReadContract({ contract: contract ?? undefined, method: "nextMarketId", params: [], queryOptions: { enabled: !!contract } } as any);
  const count = nextMarketId !== undefined ? Number(nextMarketId) : 0;

  return (
    <section className="hero-section" style={{ position: "relative", minHeight: "100vh", display: "flex", alignItems: "center", padding: "100px 0 60px", overflow: "hidden" }}>
      {/* Background accent */}
      <div style={{ position: "absolute", top: 0, right: 0, width: "50%", height: "100%", background: "radial-gradient(ellipse 80% 60% at 80% 40%, rgba(124,58,237,0.06) 0%, transparent 70%)", pointerEvents: "none" }} />
      <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, height: 1, background: "rgba(0,0,0,0.06)" }} />

      {W(
        <div className="hero-grid" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 80, alignItems: "center", position: "relative", zIndex: 2 }}>

          {/* ── LEFT: Text content ── */}
          <div className="hero-left">
            {/* Network chip */}
            <motion.div {...fadeUp} transition={{ duration: 0.4 }}
              style={{ display: "inline-flex", alignItems: "center", gap: 8, marginBottom: 28, padding: "5px 14px", borderRadius: 8, background: "rgba(16,185,129,0.08)", border: "1px solid rgba(16,185,129,0.2)" }}>
              <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#10B981", display: "block", flexShrink: 0 }} />
              <span style={{ fontSize: 11, fontFamily: "monospace", letterSpacing: "0.1em", textTransform: "uppercase", color: "#10B981", fontWeight: 600 }}>Live on Base Testnet</span>
            </motion.div>

            {/* Headline — left-aligned, bold, single color */}
            <motion.h1 {...fadeUp} transition={{ duration: 0.5, delay: 0.08 }}
              style={{ fontSize: "clamp(2.6rem,5vw,4.2rem)", fontWeight: 900, lineHeight: 1.08, letterSpacing: "-0.045em", fontFamily: "var(--font-space-grotesk,sans-serif)", margin: "0 0 22px", color: "#111827" }}>
              The smarter way<br />
              to bet on<br />
              <span style={{ color: "#7C3AED" }}>what you know.</span>
            </motion.h1>

            {/* Description */}
            <motion.p {...fadeUp} transition={{ duration: 0.5, delay: 0.16 }}
              style={{ fontSize: 16, color: "#6b7280", lineHeight: 1.75, margin: "0 0 36px", maxWidth: 420 }}>
              WAGR lets you create prediction markets on any topic and earn USDC when your call is right. No middlemen. Smart contracts handle everything.
            </motion.p>

            {/* CTAs */}
            <motion.div {...fadeUp} transition={{ duration: 0.5, delay: 0.22 }}
              style={{ display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap", marginBottom: 52 }}>
              <Link href="/markets">
                <button style={{
                  padding: "13px 28px", borderRadius: 10, fontWeight: 700, fontSize: 14, color: "#fff",
                  border: "none", cursor: "pointer", background: "#7C3AED",
                  display: "flex", alignItems: "center", gap: 8, transition: "background 0.2s",
                  fontFamily: "var(--font-space-grotesk,sans-serif)"
                }}
                  onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = "#6D28D9"; }}
                  onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = "#7C3AED"; }}>
                  Browse Markets <ArrowRight size={15} />
                </button>
              </Link>
              <Link href="/create" style={{ fontSize: 14, fontWeight: 600, color: "#6b7280", textDecoration: "none", display: "flex", alignItems: "center", gap: 6, transition: "color 0.2s" }}
                onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = "#111827"; }}
                onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = "#6b7280"; }}>
                Create a market <ArrowRight size={13} />
              </Link>
            </motion.div>

            {/* Stats — inline, minimal */}
            <motion.div {...fadeUp} transition={{ duration: 0.5, delay: 0.28 }}
              style={{ display: "flex", gap: 32, flexWrap: "wrap" }}>
              {[
                { value: String(count), label: "Active Markets", color: "#7C3AED" },
                { value: "1%", label: "Platform Fee", color: "#4b5563" },
                { value: "Base", label: "Network", color: "#2563EB" },
              ].map(s => (
                <div key={s.label} style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                  <span style={{ fontSize: 22, fontWeight: 800, fontFamily: "monospace", color: s.color, lineHeight: 1 }}>{s.value}</span>
                  <span style={{ fontSize: 11, color: "#9ca3af", textTransform: "uppercase", letterSpacing: "0.08em", fontFamily: "monospace" }}>{s.label}</span>
                </div>
              ))}
            </motion.div>
          </div>

          {/* ── RIGHT: Live market preview card ── */}
          <motion.div
            className="hero-right"
            initial={{ opacity: 0, x: 30 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.7, delay: 0.3, ease: [0.22, 1, 0.36, 1] }}
            style={{ position: "relative" }}>

            {/* Main card */}
            <div style={{ borderRadius: 20, background: "#ffffff", border: "1px solid rgba(0,0,0,0.09)", padding: 28, backdropFilter: "blur(8px)", boxShadow: "0 4px 24px rgba(0,0,0,0.08)" }}>
              {/* Card header */}
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", padding: "3px 8px", borderRadius: 6, background: "rgba(37,99,235,0.12)", color: "#2563EB", border: "1px solid rgba(37,99,235,0.2)" }}>Crypto</span>
                </div>
                <span style={{ fontSize: 11, color: "#9ca3af", fontFamily: "monospace" }}>Closes in 12d 4h</span>
              </div>

              <p style={{ fontSize: 16, fontWeight: 600, color: "#111827", lineHeight: 1.5, margin: "0 0 22px" }}>
                Will BTC hit $150,000 before end of 2026?
              </p>

              {/* Probability bar */}
              <div style={{ marginBottom: 14 }}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    <span style={{ fontSize: 13, fontWeight: 700, color: "#10B981" }}>YES</span>
                    <span style={{ fontSize: 20, fontWeight: 800, color: "#10B981", fontFamily: "monospace" }}>72%</span>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    <span style={{ fontSize: 20, fontWeight: 800, color: "#EF4444", fontFamily: "monospace" }}>28%</span>
                    <span style={{ fontSize: 13, fontWeight: 700, color: "#EF4444" }}>NO</span>
                  </div>
                </div>
                <div style={{ height: 6, borderRadius: 99, background: "rgba(0,0,0,0.06)", overflow: "hidden", display: "flex" }}>
                  <motion.div
                    initial={{ width: 0 }} animate={{ width: "72%" }}
                    transition={{ duration: 1.2, delay: 0.8, ease: "easeOut" }}
                    style={{ background: "#10B981", borderRadius: "99px 0 0 99px" }} />
                  <motion.div
                    initial={{ width: 0 }} animate={{ width: "28%" }}
                    transition={{ duration: 1.2, delay: 0.8, ease: "easeOut" }}
                    style={{ background: "#EF4444", borderRadius: "0 99px 99px 0" }} />
                </div>
              </div>

              {/* Bet buttons */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 20 }}>
                <button style={{ padding: "11px 0", borderRadius: 10, fontWeight: 700, fontSize: 14, color: "#10B981", background: "rgba(16,185,129,0.1)", border: "1px solid rgba(16,185,129,0.25)", cursor: "pointer" }}>
                  Bet YES
                </button>
                <button style={{ padding: "11px 0", borderRadius: 10, fontWeight: 700, fontSize: 14, color: "#EF4444", background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.25)", cursor: "pointer" }}>
                  Bet NO
                </button>
              </div>

              {/* Footer */}
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", paddingTop: 16, borderTop: "1px solid rgba(0,0,0,0.06)" }}>
                <span style={{ fontSize: 12, color: "#9ca3af", fontFamily: "monospace" }}>Pool: <strong style={{ color: "#374151" }}>$2,400</strong></span>
                <span style={{ fontSize: 12, color: "#9ca3af", fontFamily: "monospace" }}>248 predictors</span>
              </div>
            </div>

            {/* Small floating tag below */}
            <div style={{ marginTop: 14, display: "flex", alignItems: "center", gap: 10, padding: "10px 16px", borderRadius: 12, background: "#f9fafb", border: "1px solid rgba(0,0,0,0.07)", boxShadow: "0 1px 4px rgba(0,0,0,0.06)" }}>
              <div style={{ width: 28, height: 28, borderRadius: 8, background: "rgba(124,58,237,0.1)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                <Shield size={14} color="#7C3AED" />
              </div>
              <div>
                <p style={{ margin: 0, fontSize: 12, fontWeight: 600, color: "#374151" }}>Smart Contract Secured</p>
                <p style={{ margin: 0, fontSize: 11, color: "#9ca3af" }}>Funds locked on-chain until resolution</p>
              </div>
            </div>
          </motion.div>

        </div>,
        1200
      )}

      {/* Mobile: stack columns */}
      <style>{`
        @media(max-width: 768px) {
          .hero-grid { grid-template-columns: 1fr !important; gap: 40px !important; }
          .hero-right { display: none; }
        }
      `}</style>
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
            <h2 style={{ fontSize: "clamp(1.8rem,4vw,2.8rem)", fontWeight: 800, color: "#111827", margin: 0, fontFamily: "var(--font-space-grotesk,sans-serif)", letterSpacing: "-0.03em" }}>
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
          <div style={{ textAlign: "center", padding: "60px 0", borderRadius: 16, border: "1px solid rgba(0,0,0,0.06)", background: "#fafafa" }}>
            <p style={{ color: "#9ca3af", fontFamily: "monospace", fontSize: 13 }}>No markets yet. Be the first to create one.</p>
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
    <section style={{ padding: "80px 0", position: "relative", zIndex: 1, borderTop: "1px solid rgba(0,0,0,0.06)" }}>
      {W(<>
        <motion.div {...fadeUp} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.6 }}
          style={{ textAlign: "center", marginBottom: 56 }}>
          <p style={{ fontSize: 12, fontFamily: "monospace", letterSpacing: "0.1em", textTransform: "uppercase", color: "#7C3AED", fontWeight: 700, marginBottom: 12 }}>How It Works</p>
          <h2 style={{ fontSize: "clamp(1.8rem,4vw,2.8rem)", fontWeight: 800, color: "#111827", margin: "0 0 12px", fontFamily: "var(--font-space-grotesk,sans-serif)", letterSpacing: "-0.03em" }}>
            Three Steps to Win
          </h2>
          <p style={{ fontSize: 15, color: "#6b7280", maxWidth: 380, margin: "0 auto" }}>No middlemen. No trust. Pure math.</p>
        </motion.div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(min(100%,280px),1fr))", gap: 20 }}>
          {STEPS.map((s, i) => (
            <motion.div key={i} {...fadeUp} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.5, delay: i * 0.1 }}
              style={{ padding: 28, borderRadius: 16, background: "#ffffff", border: "1px solid rgba(0,0,0,0.07)", position: "relative", boxShadow: "0 1px 4px rgba(0,0,0,0.06)" }}>
              <div style={{ position: "absolute", top: 20, right: 20, fontSize: 32, fontWeight: 900, fontFamily: "monospace", color: "rgba(0,0,0,0.06)" }}>{s.num}</div>
              <div style={{ width: 44, height: 44, borderRadius: 12, background: `${s.color}14`, border: `1px solid ${s.color}28`, display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 18 }}>
                <s.Icon size={20} color={s.color} />
              </div>
              <h3 style={{ fontSize: 17, fontWeight: 700, color: "#111827", margin: "0 0 10px", fontFamily: "var(--font-space-grotesk,sans-serif)" }}>{s.title}</h3>
              <p style={{ fontSize: 14, color: "#6b7280", lineHeight: 1.7, margin: 0 }}>{s.desc}</p>
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
    <section style={{ padding: "80px 0", position: "relative", zIndex: 1, borderTop: "1px solid rgba(0,0,0,0.06)" }}>
      {W(<>
        <motion.div {...fadeUp} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.6 }}
          style={{ textAlign: "center", marginBottom: 56 }}>
          <p style={{ fontSize: 12, fontFamily: "monospace", letterSpacing: "0.1em", textTransform: "uppercase", color: "#7C3AED", fontWeight: 700, marginBottom: 12 }}>Why WAGR</p>
          <h2 style={{ fontSize: "clamp(1.8rem,4vw,2.8rem)", fontWeight: 800, color: "#111827", margin: "0 0 12px", fontFamily: "var(--font-space-grotesk,sans-serif)", letterSpacing: "-0.03em" }}>
            Built Different
          </h2>
          <p style={{ fontSize: 15, color: "#6b7280", maxWidth: 380, margin: "0 auto" }}>Every feature designed to eliminate trust and maximize fairness.</p>
        </motion.div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(min(100%,280px),1fr))", gap: 16 }}>
          {FEATS.map((f, i) => (
            <motion.div key={i} {...fadeUp} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.5, delay: i * 0.07 }}
              style={{ padding: 24, borderRadius: 16, background: "#ffffff", border: "1px solid rgba(0,0,0,0.07)", display: "flex", flexDirection: "column", gap: 14, transition: "border-color 0.2s, box-shadow 0.2s", boxShadow: "0 1px 4px rgba(0,0,0,0.06)" }}
              onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = "rgba(124,58,237,0.3)"; (e.currentTarget as HTMLElement).style.boxShadow = "0 4px 16px rgba(124,58,237,0.1)"; }}
              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = "rgba(0,0,0,0.07)"; (e.currentTarget as HTMLElement).style.boxShadow = "0 1px 4px rgba(0,0,0,0.06)"; }}>
              <div style={{ width: 40, height: 40, borderRadius: 10, background: "rgba(124,58,237,0.1)", border: "1px solid rgba(124,58,237,0.2)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <f.Icon size={18} color="#7C3AED" />
              </div>
              <div>
                <h3 style={{ fontSize: 15, fontWeight: 700, color: "#111827", margin: "0 0 6px", fontFamily: "var(--font-space-grotesk,sans-serif)" }}>{f.title}</h3>
                <p style={{ fontSize: 13, color: "#6b7280", lineHeight: 1.7, margin: 0 }}>{f.desc}</p>
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
    <section style={{ padding: "80px 0 120px", position: "relative", zIndex: 1, borderTop: "1px solid rgba(0,0,0,0.06)" }}>
      {W(
        <motion.div {...fadeUp} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.6 }}
          className="cta-card"
          style={{ padding: "56px 48px", borderRadius: 24, position: "relative", overflow: "hidden", background: "rgba(124,58,237,0.04)", border: "1px solid rgba(124,58,237,0.18)" }}>
          <div style={{ position: "absolute", inset: 0, background: "radial-gradient(ellipse 60% 60% at 50% 0%, rgba(124,58,237,0.07), transparent)", pointerEvents: "none" }} />
          <div className="cta-container" style={{ position: "relative" }}>
            
            {/* Left Column */}
            <div className="cta-left">
              <div className="cta-tagline" style={{ fontSize: 11, fontFamily: "monospace", letterSpacing: "0.15em", textTransform: "uppercase", color: "#A78BFA", fontWeight: 700, marginBottom: 16, display: "flex", alignItems: "center", gap: 6 }}>
                <TrendingUp size={12} color="#A78BFA" />
                <span>Put your conviction to the test</span>
              </div>
              <h2 style={{ fontSize: "clamp(2rem,4.2vw,3rem)", fontWeight: 900, color: "#111827", margin: "0 0 16px", fontFamily: "var(--font-space-grotesk,sans-serif)", letterSpacing: "-0.04em", lineHeight: 1.15 }}>
                Predict the future,<br />Get paid instantly.
              </h2>
              <p style={{ fontSize: 15, color: "#6b7280", maxWidth: 480, margin: "0 0 32px", lineHeight: 1.7 }}>
                Connect your wallet, browse active markets on Base, and trade prediction shares on sports, crypto, and macro events. Smart contracts handle everything automatically.
              </p>
              <div className="cta-buttons" style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
                <Link href="/markets">
                  <button style={{
                    padding: "14px 32px", borderRadius: 12, fontWeight: 700, fontSize: 14, color: "#fff",
                    border: "none", cursor: "pointer", background: "#7C3AED",
                    display: "flex", alignItems: "center", gap: 8, transition: "background 0.2s, transform 0.1s",
                    fontFamily: "var(--font-space-grotesk,sans-serif)"
                  }}
                    onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = "#6D28D9"; }}
                    onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = "#7C3AED"; }}>
                    Explore Markets <ArrowRight size={15} />
                  </button>
                </Link>
                <Link href="/bet/create">
                  <button style={{
                    padding: "14px 32px", borderRadius: 12, fontWeight: 600, fontSize: 14,
                    color: "#4b5563", background: "rgba(0,0,0,0.04)",
                    border: "1px solid rgba(0,0,0,0.12)", cursor: "pointer",
                    transition: "all 0.2s"
                  }}
                    onMouseEnter={e => {
                      (e.currentTarget as HTMLElement).style.color = "#111827";
                      (e.currentTarget as HTMLElement).style.borderColor = "rgba(124,58,237,0.4)";
                      (e.currentTarget as HTMLElement).style.background = "rgba(124,58,237,0.04)";
                    }}
                    onMouseLeave={e => {
                      (e.currentTarget as HTMLElement).style.color = "#4b5563";
                      (e.currentTarget as HTMLElement).style.borderColor = "rgba(0,0,0,0.12)";
                      (e.currentTarget as HTMLElement).style.background = "rgba(0,0,0,0.04)";
                    }}
                  >
                    Bet a Friend
                  </button>
                </Link>
              </div>
            </div>

            {/* Right Column (Tickets visual stack) */}
            <div className="cta-right">
              {/* Ticket 1 (Settled Bet) */}
              <motion.div
                initial={{ rotate: -3 }}
                animate={{ y: [-6, 6, -6] }}
                transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
                style={{
                  position: "absolute",
                  width: 250,
                  padding: 18,
                  borderRadius: 16,
                  background: "#ffffff",
                  border: "1px solid rgba(0,0,0,0.08)",
                  backdropFilter: "blur(12px)",
                  boxShadow: "0 8px 32px rgba(0,0,0,0.10)",
                  left: "0%",
                  top: "0%",
                  zIndex: 2,
                  textAlign: "left"
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                  <span style={{ fontSize: 9, fontWeight: 700, letterSpacing: "0.05em", textTransform: "uppercase", padding: "2px 6px", borderRadius: 4, background: "rgba(124,58,237,0.1)", color: "#7C3AED", border: "1px solid rgba(124,58,237,0.2)" }}>Crypto</span>
                  <span style={{ fontSize: 10, color: "#10B981", fontWeight: 700, display: "flex", alignItems: "center", gap: 3 }}>
                    <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#10B981" }} />
                    +180.00 USDC
                  </span>
                </div>
                <p style={{ margin: "0 0 10px", fontSize: 13, fontWeight: 600, color: "#111827" }}>Will BTC cross $100k in 2025?</p>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 10, color: "#9ca3af" }}>
                  <span>Position: <strong style={{ color: "#10B981" }}>YES</strong></span>
                  <span>Tx: <span style={{ fontFamily: "monospace", color: "#4b5563" }}>0x9a2f...</span></span>
                </div>
              </motion.div>

              {/* Ticket 2 (Active Bet) */}
              <motion.div
                initial={{ rotate: 4 }}
                animate={{ y: [6, -6, 6] }}
                transition={{ duration: 7, repeat: Infinity, ease: "easeInOut" }}
                style={{
                  position: "absolute",
                  width: 240,
                  padding: 16,
                  borderRadius: 16,
                  background: "#ffffff",
                  border: "1px solid rgba(0,0,0,0.07)",
                  backdropFilter: "blur(8px)",
                  boxShadow: "0 8px 24px rgba(0,0,0,0.08)",
                  right: "0%",
                  bottom: "0%",
                  zIndex: 1,
                  textAlign: "left"
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                  <span style={{ fontSize: 9, fontWeight: 700, letterSpacing: "0.05em", textTransform: "uppercase", padding: "2px 6px", borderRadius: 4, background: "rgba(37,99,235,0.1)", color: "#2563EB", border: "1px solid rgba(37,99,235,0.2)" }}>Macro</span>
                  <span style={{ fontSize: 9, color: "#9ca3af", fontFamily: "monospace" }}>Closes 2d</span>
                </div>
                <p style={{ margin: "0 0 12px", fontSize: 12, fontWeight: 600, color: "#374151" }}>Fed cuts interest rates in Sep?</p>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  <span style={{ fontSize: 10, color: "#6b7280" }}>Option: <strong style={{ color: "#EF4444" }}>NO</strong></span>
                  <span style={{ fontSize: 10, fontWeight: 700, color: "#EF4444" }}>74% Chance</span>
                </div>
              </motion.div>
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
      <div style={{ position: "relative", zIndex: 1 }}>
        <Hero />
        <TrendingMarkets />
        <HowItWorks />
        <Features />
        <CTA />
        <Footer />
      </div>

      <style>{`
        @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.4} }
        html, body { overflow-x: hidden; }

        /* ── CTA Desktop ── */
        .cta-container {
          display: grid;
          grid-template-columns: 1.15fr 0.85fr;
          gap: 48px;
          align-items: center;
        }
        .cta-left { text-align: left; }
        .cta-right {
          display: flex;
          justify-content: center;
          position: relative;
          height: 250px;
          width: 100%;
        }

        /* ── Mobile: 768px and below ── */
        @media(max-width: 768px) {
          /* Hero */
          .hero-section {
            min-height: auto !important;
            padding: 80px 0 40px !important;
          }
          .hero-grid {
            grid-template-columns: 1fr !important;
            gap: 32px !important;
          }
          .hero-left {
            text-align: center !important;
          }
          .hero-left h1 {
            font-size: clamp(2rem, 8vw, 2.8rem) !important;
          }
          .hero-left p {
            margin-left: auto !important;
            margin-right: auto !important;
          }
          .hero-right {
            display: none !important;
          }

          /* CTA */
          .cta-card {
            padding: 32px 20px !important;
            border-radius: 16px !important;
          }
          .cta-container {
            grid-template-columns: 1fr !important;
            gap: 24px !important;
          }
          .cta-left {
            text-align: center !important;
          }
          .cta-left h2 {
            font-size: clamp(1.6rem, 7vw, 2.2rem) !important;
          }
          .cta-left p {
            margin-left: auto !important;
            margin-right: auto !important;
          }
          .cta-tagline {
            justify-content: center !important;
          }
          .cta-buttons {
            justify-content: center !important;
          }
          .cta-right {
            display: none !important;
          }

          /* Sections */
          section {
            padding-top: 56px !important;
            padding-bottom: 56px !important;
          }
        }

        /* ── Extra small: 480px and below ── */
        @media(max-width: 480px) {
          .hero-section {
            padding: 72px 0 32px !important;
          }
          .hero-left h1 {
            font-size: 1.8rem !important;
          }
          .cta-card {
            padding: 24px 16px !important;
          }
          .cta-left h2 {
            font-size: 1.5rem !important;
          }
          .cta-buttons {
            flex-direction: column !important;
            align-items: center !important;
          }
          .cta-buttons button {
            width: 100% !important;
            justify-content: center !important;
          }
          section {
            padding-top: 40px !important;
            padding-bottom: 40px !important;
          }
        }

        /* ── Touch devices ── */
        @media(hover: none) and (pointer: coarse) {
          button, a { min-height: 44px; }
        }
        * { -webkit-tap-highlight-color: transparent; }
      `}</style>
    </>
  );
}
