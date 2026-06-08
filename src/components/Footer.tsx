"use client";
import React from "react";
import Link from "next/link";
import Image from "next/image";
import { Send } from "lucide-react";

const XIcon = ({ size = 15 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor">
    <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
  </svg>
);

const DiscordIcon = ({ size = 15 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor">
    <path d="M20.317 4.3698a19.7913 19.7913 0 00-4.8851-1.5152.0741.0741 0 00-.0785.0371c-.211.3753-.4447.8648-.6083 1.2495-1.8447-.2762-3.68-.2762-5.4868 0-.1636-.3933-.4058-.8742-.6177-1.2495a.077.077 0 00-.0785-.037 19.7363 19.7363 0 00-4.8852 1.515.0699.0699 0 00-.0321.0277C.5334 9.0458-.319 13.5799.0992 18.0578a.0824.0824 0 00.0312.0561c2.0528 1.5076 4.0413 2.4228 5.9929 3.0294a.0777.0777 0 00.0842-.0276c.4616-.6304.8731-1.2952 1.226-1.9942a.076.076 0 00-.0416-.1057c-.6528-.2476-1.2743-.5495-1.8722-.8923a.077.077 0 01-.0076-.1277c.1258-.0943.2517-.1923.3718-.2914a.0743.0743 0 01.0776-.0105c3.9278 1.7933 8.18 1.7933 12.0614 0a.0739.0739 0 01.0785.0095c.1202.099.246.1981.3728.2924a.077.077 0 01-.0066.1276 12.2986 12.2986 0 01-1.873.8914.0766.0766 0 00-.0407.1067c.3604.698.7719 1.3628 1.225 1.9932a.076.076 0 00.0842.0286c1.961-.6067 3.9495-1.5219 6.0023-3.0294a.077.077 0 00.0313-.0552c.5004-5.177-.8382-9.6739-3.5485-13.6604a.061.061 0 00-.0312-.0286zM8.02 15.3312c-1.1825 0-2.1569-1.0857-2.1569-2.419 0-1.3332.9555-2.4189 2.157-2.4189 1.2108 0 2.1757 1.0952 2.1568 2.419 0 1.3332-.9555 2.4189-2.1569 2.4189zm7.9748 0c-1.1825 0-2.1569-1.0857-2.1569-2.419 0-1.3332.9554-2.4189 2.1569-2.4189 1.2108 0 2.1757 1.0952 2.1568 2.419 0 1.3332-.946 2.4189-2.1568 2.4189Z"/>
  </svg>
);

const LINKS = [
  { label: "Markets",     href: "/markets"    },
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
            <div style={{ marginBottom: 14 }}>
              <Image
                src="/wagr-logo.png"
                alt="WAGR"
                width={80}
                height={32}
                style={{ objectFit: "contain", display: "block", height: 32, width: "auto" }}
              />
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
                { Icon: DiscordIcon, href: "https://discord.gg/x3ZytGmHG" },
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
          <p style={{ fontSize: 12, color: "#9ca3af", fontFamily: "monospace", margin: 0 }}>© 2024 WAGR. All rights reserved. Powered by Base.</p>
          <p style={{ fontSize: 12, color: "#9ca3af", fontFamily: "monospace", margin: 0 }}>Not financial advice. Bet responsibly.</p>
        </div>
      </div>
    </footer>
  );
}
