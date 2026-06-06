import Link from "next/link";
import { Zap } from "lucide-react";

export default function Footer() {
  return (
    <footer
      style={{
        borderTop: "1px solid var(--border)",
        background: "var(--surface)",
        padding: "2rem 0",
        marginTop: "auto",
      }}
    >
      <div
        className="container"
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          flexWrap: "wrap",
          gap: "1rem",
        }}
      >
        {/* Logo + tagline */}
        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
          <div
            style={{
              width: "28px",
              height: "28px",
              borderRadius: "6px",
              background: "var(--gradient-accent)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Zap size={14} color="white" fill="white" />
          </div>
          <span style={{ fontWeight: 700, fontSize: "1rem" }}>WAGR</span>
          <span style={{ color: "var(--text-muted)", fontSize: "0.875rem", marginLeft: "0.5rem" }}>
            Prove it. Win it.
          </span>
        </div>

        {/* Links */}
        <div
          style={{
            display: "flex",
            gap: "1.5rem",
            alignItems: "center",
          }}
        >
          <Link
            href="/game"
            style={{
              color: "var(--text-muted)",
              fontSize: "0.875rem",
              textDecoration: "none",
              transition: "color 0.2s",
            }}
          >
            Daily Game
          </Link>
          <Link
            href="/bet/create"
            style={{
              color: "var(--text-muted)",
              fontSize: "0.875rem",
              textDecoration: "none",
              transition: "color 0.2s",
            }}
          >
            Bet a Friend
          </Link>
          <Link
            href="/dashboard"
            style={{
              color: "var(--text-muted)",
              fontSize: "0.875rem",
              textDecoration: "none",
              transition: "color 0.2s",
            }}
          >
            Dashboard
          </Link>
        </div>

        {/* Bottom text */}
        <p
          style={{
            color: "var(--text-muted)",
            fontSize: "0.8rem",
            width: "100%",
            textAlign: "center",
            marginTop: "0.5rem",
          }}
        >
          Built on Base · Powered by USDC · 3% platform fee auto-deducted on all payouts
        </p>
      </div>
    </footer>
  );
}
