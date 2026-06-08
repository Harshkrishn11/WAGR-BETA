"use client";
import React from "react";
import Link from "next/link";
import { Globe, Send } from "lucide-react";

const XIcon = ({ size = 15 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor">
    <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
  </svg>
);

const LINKS = [
  { label: "Markets",     href: "/markets"    },
  { label: "Daily Game",  href: "/game"       },
  { label: "Bet a Friend",href: "/bet/create" },
  { label: "Dashboard",   href: "/dashboard"  },
  { label: "Docs",        href: "/docs"       },
];

export default function Footer() {
  return (
    <footer style={{ borderTop: "1px solid #e5e7eb", background: "#f9fafb" }}>
      <div style={{ maxWidth: 1200, margin: "0 auto", padding: "48px 24px" }}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(200px,1fr))", gap: 40 }}>
          {/* Brand */}
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14 }}>
              <div style={{ width: 34, height: 34, borderRadius: 10, background: "linear-gradient(135deg,#7C3AED,#9B5CFF)", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 4px 16px rgba(124,58,237,0.25)" }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="white"><path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" /></svg>
              </div>
              <span style={{ fontSize: 20, fontWeight: 800, color: "#111827", fontFamily: "var(--font-space-grotesk,sans-serif)" }}>WAGR</span>
            </div>
            <p style={{ fontSize: 13, color: "#6b7280", lineHeight: 1.65, margin: "0 0 16px", maxWidth: 220 }}>The future is tradeable. Predict, trade, and win on-chain.</p>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              <span style={{ padding: "4px 10px", borderRadius: 99, fontSize: 10, fontFamily: "monospace", letterSpacing: "0.08em", border: "1px solid rgba(37,99,235,0.3)", background: "rgba(37,99,235,0.06)", color: "#2563EB" }}>⛓ Built on Base</span>
              <span style={{ padding: "4px 10px", borderRadius: 99, fontSize: 10, fontFamily: "monospace", letterSpacing: "0.08em", border: "1px solid rgba(22,163,74,0.3)", background: "rgba(22,163,74,0.06)", color: "#16a34a" }}>✓ Audited</span>
            </div>
          </div>

          {/* Links */}
          <div>
            <p style={{ fontSize: 10, fontFamily: "monospace", letterSpacing: "0.12em", textTransform: "uppercase", color: "#9ca3af", marginBottom: 16 }}>Platform</p>
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {LINKS.map((l) => (
                <Link key={l.label} href={l.href} style={{ fontSize: 13, color: "#6b7280", textDecoration: "none", display: "flex", alignItems: "center", gap: 6, transition: "color 0.2s" }}
                  onMouseEnter={e => (e.currentTarget.style.color = "#111827")}
                  onMouseLeave={e => (e.currentTarget.style.color = "#6b7280")}
                >
                  {l.label}
                </Link>
              ))}
            </div>
          </div>

          {/* Social */}
          <div>
            <p style={{ fontSize: 10, fontFamily: "monospace", letterSpacing: "0.12em", textTransform: "uppercase", color: "#9ca3af", marginBottom: 16 }}>Connect</p>
            <div style={{ display: "flex", gap: 10, marginBottom: 16 }}>
              {[
                { Icon: XIcon, href: "https://x.com/WAGR_xyz" },
                { Icon: Send, href: "https://t.me/WAGRtg" },
                { Icon: Globe, href: "https://wagr.xyz" },
              ].map(({ Icon, href }, i) => (
                <a key={i} href={href} target="_blank" rel="noopener noreferrer" style={{ textDecoration: "none" }}>
                  <button style={{ width: 38, height: 38, borderRadius: 10, border: "1px solid #e5e7eb", background: "#ffffff", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", color: "#6b7280", transition: "all 0.2s", boxShadow: "0 1px 3px rgba(0,0,0,0.06)" }}
                    onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = "#7C3AED"; (e.currentTarget as HTMLElement).style.color = "#7C3AED"; }}
                    onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = "#e5e7eb"; (e.currentTarget as HTMLElement).style.color = "#6b7280"; }}
                  >
                    <Icon size={15} />
                  </button>
                </a>
              ))}
            </div>
            <p style={{ fontSize: 12, color: "#9ca3af", lineHeight: 1.6, margin: 0 }}>3% platform fee auto-deducted.<br />Contracts open-source on BaseScan.</p>
          </div>
        </div>

        {/* Bottom bar */}
        <div style={{ marginTop: 40, paddingTop: 24, borderTop: "1px solid #e5e7eb", display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: 8 }}>
          <p style={{ fontSize: 12, color: "#9ca3af", fontFamily: "monospace", margin: 0 }}>© 2024 WAGR. All rights reserved. Powered by USDC.</p>
          <p style={{ fontSize: 12, color: "#9ca3af", fontFamily: "monospace", margin: 0 }}>Not financial advice. Bet responsibly.</p>
        </div>
      </div>
    </footer>
  );
}
