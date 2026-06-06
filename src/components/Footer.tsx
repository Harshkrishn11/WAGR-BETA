"use client";
import React from "react";
import { motion } from "framer-motion";
import { Globe, MessageCircle, ExternalLink, Send } from "lucide-react";

const XIcon = ({ size = 15 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor">
    <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
  </svg>
);

const PAYOUTS = [
  { addr: "0x4A2...f1e", amount: "$450",   cat: "Sports"   },
  { addr: "0xB9C...22a", amount: "$1,200", cat: "Crypto"   },
  { addr: "0x7F1...9Bc", amount: "$88",    cat: "Politics" },
  { addr: "0x2D4...e4f", amount: "$3,100", cat: "Tech"     },
  { addr: "0x9A1...c2b", amount: "$150",   cat: "Sports"   },
  { addr: "0x5E6...77d", amount: "$890",   cat: "Crypto"   },
  { addr: "0x1F3...a9e", amount: "$55",    cat: "Politics" },
  { addr: "0x8C2...b4a", amount: "$2,400", cat: "Crypto"   },
  { addr: "0x3E7...d2c", amount: "$720",   cat: "Macro"    },
  { addr: "0x6D1...a88", amount: "$340",   cat: "Tech"     },
];

const CAT_CLR: Record<string, string> = {
  Sports: "#00D4FF", Crypto: "#9B5CFF", Politics: "#60A5FA", Tech: "#00FF88", Macro: "#FFB800",
};

const LINKS = [
  { label: "Markets",    href: "/markets"   },
  { label: "Daily Game", href: "/game"      },
  { label: "Bet a Friend",href: "/bet/create"},
  { label: "Dashboard",  href: "/dashboard" },
  { label: "Docs",       href: "/docs"      },
];

export default function Footer() {
  const all = [...PAYOUTS, ...PAYOUTS]; // duplicate for seamless loop

  return (
    <footer style={{ borderTop: "1px solid rgba(255,255,255,0.07)", background: "rgba(0,0,0,0.35)" }}>
      {/* ── Live Payouts Marquee ── */}
      <div style={{ borderBottom: "1px solid rgba(255,255,255,0.05)", padding: "12px 0", overflow: "hidden", position: "relative" }}>
        {/* Fade edges */}
        <div style={{ position: "absolute", left: 0, top: 0, bottom: 0, width: 80, background: "linear-gradient(90deg,#0B0B13,transparent)", zIndex: 2, pointerEvents: "none" }} />
        <div style={{ position: "absolute", right: 0, top: 0, bottom: 0, width: 80, background: "linear-gradient(-90deg,#0B0B13,transparent)", zIndex: 2, pointerEvents: "none" }} />
        {/* Label */}
        <div style={{ position: "absolute", left: 16, top: "50%", transform: "translateY(-50%)", zIndex: 3, display: "flex", alignItems: "center", gap: 6 }}>
          <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#00FF88", boxShadow: "0 0 6px #00FF88" }} />
          <span style={{ fontSize: 9, fontFamily: "monospace", letterSpacing: "0.12em", textTransform: "uppercase", color: "rgba(255,255,255,0.25)" }}>Live Payouts</span>
        </div>
        <motion.div
          animate={{ x: ["0%", "-50%"] }}
          transition={{ duration: 28, repeat: Infinity, ease: "linear" }}
          style={{ display: "flex", alignItems: "center", paddingLeft: 160 }}
        >
          {all.map((p, i) => (
            <div key={i} style={{ display: "flex", alignItems: "center", gap: 10, paddingRight: 40, flexShrink: 0 }}>
              <span style={{ width: 5, height: 5, borderRadius: "50%", background: "#00FF88" }} />
              <span style={{ fontFamily: "monospace", fontSize: 12, color: "rgba(255,255,255,0.4)" }}>{p.addr}</span>
              <span style={{ fontFamily: "monospace", fontSize: 12, fontWeight: 700, color: "#fff" }}>just won {p.amount}</span>
              <span style={{ fontFamily: "monospace", fontSize: 10, color: CAT_CLR[p.cat] ?? "#9B5CFF" }}>#{p.cat}</span>
            </div>
          ))}
        </motion.div>
      </div>

      {/* ── Main footer body ── */}
      <div style={{ maxWidth: 1200, margin: "0 auto", padding: "48px 24px" }}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(200px,1fr))", gap: 40 }}>
          {/* Brand */}
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14 }}>
              <div style={{ width: 34, height: 34, borderRadius: 10, background: "linear-gradient(135deg,#7C3AED,#9B5CFF)", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 0 20px rgba(139,92,246,0.4)" }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="white"><path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" /></svg>
              </div>
              <span style={{ fontSize: 20, fontWeight: 800, color: "#fff", fontFamily: "var(--font-space-grotesk,sans-serif)" }}>WAGR</span>
            </div>
            <p style={{ fontSize: 13, color: "rgba(255,255,255,0.3)", lineHeight: 1.65, margin: "0 0 16px", maxWidth: 220 }}>The future is tradeable. Predict, trade, and win on-chain.</p>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              <span style={{ padding: "4px 10px", borderRadius: 99, fontSize: 10, fontFamily: "monospace", letterSpacing: "0.08em", border: "1px solid rgba(0,212,255,0.3)", background: "rgba(0,212,255,0.08)", color: "#00D4FF" }}>⛓ Built on Base</span>
              <span style={{ padding: "4px 10px", borderRadius: 99, fontSize: 10, fontFamily: "monospace", letterSpacing: "0.08em", border: "1px solid rgba(0,255,136,0.3)", background: "rgba(0,255,136,0.08)", color: "#00FF88" }}>✓ Audited</span>
            </div>
          </div>

          {/* Links */}
          <div>
            <p style={{ fontSize: 10, fontFamily: "monospace", letterSpacing: "0.12em", textTransform: "uppercase", color: "rgba(255,255,255,0.2)", marginBottom: 16 }}>Platform</p>
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {LINKS.map((l) => (
                <a key={l.label} href={l.href} style={{ fontSize: 13, color: "rgba(255,255,255,0.38)", textDecoration: "none", display: "flex", alignItems: "center", gap: 6, transition: "color 0.2s" }}
                  onMouseEnter={e => (e.currentTarget.style.color = "#fff")}
                  onMouseLeave={e => (e.currentTarget.style.color = "rgba(255,255,255,0.38)")}
                >
                  {l.label}
                </a>
              ))}
            </div>
          </div>

          {/* Social */}
          <div>
            <p style={{ fontSize: 10, fontFamily: "monospace", letterSpacing: "0.12em", textTransform: "uppercase", color: "rgba(255,255,255,0.2)", marginBottom: 16 }}>Connect</p>
            <div style={{ display: "flex", gap: 10, marginBottom: 16 }}>
              {[
                { Icon: XIcon, href: "https://x.com/WAGR_xyz" },
                { Icon: Send, href: "https://t.me/WAGRtg" },
                { Icon: Globe, href: "https://wagr.xyz" } // Placeholder for future site
              ].map(({ Icon, href }, i) => (
                <a key={i} href={href} target="_blank" rel="noopener noreferrer" style={{ textDecoration: "none" }}>
                  <button style={{ width: 38, height: 38, borderRadius: 10, border: "1px solid rgba(255,255,255,0.08)", background: "rgba(255,255,255,0.03)", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", color: "rgba(255,255,255,0.35)", transition: "all 0.2s" }}
                    onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = "rgba(255,255,255,0.2)"; (e.currentTarget as HTMLElement).style.color = "#fff"; }}
                    onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = "rgba(255,255,255,0.08)"; (e.currentTarget as HTMLElement).style.color = "rgba(255,255,255,0.35)"; }}
                  >
                    <Icon size={15} />
                  </button>
                </a>
              ))}
            </div>
            <p style={{ fontSize: 12, color: "rgba(255,255,255,0.2)", lineHeight: 1.6, margin: 0 }}>3% platform fee auto-deducted.<br />Contracts open-source on BaseScan.</p>
          </div>
        </div>

        {/* Bottom bar */}
        <div style={{ marginTop: 40, paddingTop: 24, borderTop: "1px solid rgba(255,255,255,0.05)", display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: 8 }}>
          <p style={{ fontSize: 12, color: "rgba(255,255,255,0.18)", fontFamily: "monospace", margin: 0 }}>© 2024 WAGR. All rights reserved. Powered by USDC.</p>
          <p style={{ fontSize: 12, color: "rgba(255,255,255,0.18)", fontFamily: "monospace", margin: 0 }}>Not financial advice. Bet responsibly.</p>
        </div>
      </div>
    </footer>
  );
}
