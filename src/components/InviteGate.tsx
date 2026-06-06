"use client";

import React, { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useActiveAccount } from "thirdweb/react";
import { Key, ArrowRight, Loader2, CheckCircle2, Lock } from "lucide-react";
import toast from "react-hot-toast";

const LOCAL_KEY = "wagr_beta_access";

// Store approval per wallet so switching wallets re-checks
function getApprovedWallets(): string[] {
  try {
    return JSON.parse(localStorage.getItem(LOCAL_KEY) || "[]");
  } catch {
    return [];
  }
}
function approveWalletLocally(wallet: string) {
  const list = getApprovedWallets();
  if (!list.includes(wallet.toLowerCase())) {
    list.push(wallet.toLowerCase());
    localStorage.setItem(LOCAL_KEY, JSON.stringify(list));
  }
}
function isWalletApprovedLocally(wallet: string) {
  return getApprovedWallets().includes(wallet.toLowerCase());
}

export default function InviteGate({ children }: { children: React.ReactNode }) {
  const account = useActiveAccount();
  const wallet = account?.address;

  const [status, setStatus] = useState<"loading" | "locked" | "unlocked">("loading");
  const [code, setCode] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [shake, setShake] = useState(false);

  const checkAccess = useCallback(async (address: string) => {
    // 1. Check localStorage first (fast)
    if (isWalletApprovedLocally(address)) {
      setStatus("unlocked");
      return;
    }
    // 2. Verify with server (handles returning users on new devices)
    try {
      const res = await fetch(`/api/invite/check-wallet?wallet=${address}`);
      const data = await res.json();
      if (data.approved) {
        approveWalletLocally(address);
        setStatus("unlocked");
      } else {
        setStatus("locked");
      }
    } catch {
      setStatus("locked");
    }
  }, []);

  useEffect(() => {
    if (!wallet) {
      // No wallet connected — show the gate screen (to invite code entry)
      setStatus("locked");
    } else {
      setStatus("loading");
      checkAccess(wallet);
    }
  }, [wallet, checkAccess]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!wallet) {
      toast.error("Please connect your wallet first.");
      return;
    }
    if (!code.trim()) return;

    setSubmitting(true);
    try {
      const res = await fetch("/api/invite/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: code.trim(), wallet }),
      });
      const data = await res.json();

      if (data.success) {
        approveWalletLocally(wallet);
        setStatus("unlocked");
        toast.success("Access granted! Welcome to WAGR.");
      } else {
        setShake(true);
        setTimeout(() => setShake(false), 600);
        toast.error(data.error || "Invalid invite code.");
      }
    } catch {
      toast.error("Something went wrong. Try again.");
    } finally {
      setSubmitting(false);
    }
  };

  if (status === "unlocked") return <>{children}</>;

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 9999,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "#050510",
        padding: 24,
      }}
    >
      {/* Background blobs */}
      <div style={{ position: "absolute", inset: 0, overflow: "hidden", pointerEvents: "none" }}>
        <motion.div
          animate={{ scale: [1, 1.1, 1], opacity: [0.3, 0.5, 0.3] }}
          transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
          style={{ position: "absolute", top: "20%", left: "20%", width: 500, height: 500,
            background: "radial-gradient(circle, rgba(168,85,247,0.25) 0%, transparent 70%)", filter: "blur(60px)" }}
        />
        <motion.div
          animate={{ scale: [1, 1.15, 1], opacity: [0.2, 0.4, 0.2] }}
          transition={{ duration: 10, repeat: Infinity, ease: "easeInOut", delay: 2 }}
          style={{ position: "absolute", bottom: "20%", right: "15%", width: 400, height: 400,
            background: "radial-gradient(circle, rgba(6,182,212,0.2) 0%, transparent 70%)", filter: "blur(60px)" }}
        />
        {/* Grid */}
        <div style={{ position: "absolute", inset: 0,
          backgroundImage: "radial-gradient(rgba(255,255,255,0.025) 1px, transparent 1px)",
          backgroundSize: "32px 32px" }} />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 30, scale: 0.96 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
        style={{ position: "relative", zIndex: 1, width: "100%", maxWidth: 460 }}
      >
        {/* Card */}
        <div
          style={{
            background: "rgba(10,10,25,0.85)",
            border: "1px solid rgba(168,85,247,0.25)",
            borderRadius: 28,
            padding: "48px 40px",
            backdropFilter: "blur(30px)",
            boxShadow: "0 0 80px rgba(168,85,247,0.12), 0 40px 80px rgba(0,0,0,0.6)",
          }}
        >
          {/* Logo badge */}
          <div style={{ textAlign: "center", marginBottom: 36 }}>
            <motion.div
              animate={{ rotate: [0, 5, -5, 0] }}
              transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
              style={{ display: "inline-flex", alignItems: "center", justifyContent: "center",
                width: 64, height: 64, borderRadius: 18, marginBottom: 20,
                background: "linear-gradient(135deg, rgba(168,85,247,0.2), rgba(6,182,212,0.2))",
                border: "1px solid rgba(168,85,247,0.3)" }}
            >
              <Lock size={28} color="#A855F7" />
            </motion.div>

            <h1 style={{ fontSize: 32, fontWeight: 900, color: "#fff", margin: "0 0 8px",
              fontFamily: "var(--font-space-grotesk, sans-serif)", letterSpacing: "-0.03em" }}>
              WAGR <span className="grad-purple-cyan">Beta</span>
            </h1>
            <p style={{ fontSize: 14, color: "rgba(255,255,255,0.4)", margin: 0, lineHeight: 1.6 }}>
              This is a private testnet. Enter your invite code to get access.
            </p>
          </div>

          {status === "loading" ? (
            <div style={{ display: "flex", alignItems: "center", justifyContent: "center", padding: "32px 0", gap: 12, color: "rgba(255,255,255,0.4)" }}>
              <Loader2 size={20} style={{ animation: "spin 1s linear infinite" }} />
              <span>Checking access...</span>
            </div>
          ) : (
            <form onSubmit={handleSubmit}>
              {/* Step 1: Connect wallet */}
              <div style={{ marginBottom: 24, padding: 16, borderRadius: 14,
                background: wallet ? "rgba(52,211,153,0.08)" : "rgba(255,255,255,0.03)",
                border: `1px solid ${wallet ? "rgba(52,211,153,0.25)" : "rgba(255,255,255,0.08)"}`,
                transition: "all 0.3s" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <div style={{ width: 28, height: 28, borderRadius: 8, display: "flex", alignItems: "center",
                    justifyContent: "center", background: wallet ? "rgba(52,211,153,0.2)" : "rgba(255,255,255,0.05)",
                    flexShrink: 0 }}>
                    {wallet ? <CheckCircle2 size={16} color="#34D399" /> : <span style={{ fontSize: 12, fontWeight: 700, color: "rgba(255,255,255,0.4)" }}>1</span>}
                  </div>
                  <div>
                    <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: wallet ? "#34D399" : "rgba(255,255,255,0.6)" }}>
                      {wallet ? "Wallet Connected" : "Connect Your Wallet"}
                    </p>
                    {wallet && (
                      <p style={{ margin: 0, fontSize: 11, fontFamily: "monospace", color: "rgba(255,255,255,0.35)", marginTop: 2 }}>
                        {wallet.slice(0, 8)}...{wallet.slice(-6)}
                      </p>
                    )}
                  </div>
                </div>
              </div>

              {/* Step 2: Invite code */}
              <div style={{ marginBottom: 20 }}>
                <label style={{ display: "block", fontSize: 12, fontWeight: 700, color: "rgba(255,255,255,0.4)",
                  textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 8 }}>
                  Step 2 — Invite Code
                </label>
                <motion.div
                  animate={shake ? { x: [-8, 8, -6, 6, -4, 4, 0] } : { x: 0 }}
                  transition={{ duration: 0.5 }}
                >
                  <div style={{ position: "relative" }}>
                    <Key size={16} style={{ position: "absolute", left: 14, top: "50%", transform: "translateY(-50%)",
                      color: "rgba(168,85,247,0.6)", pointerEvents: "none" }} />
                    <input
                      type="text"
                      value={code}
                      onChange={e => setCode(e.target.value.toUpperCase())}
                      placeholder="WAGR-XXXXXXXX"
                      spellCheck={false}
                      autoComplete="off"
                      style={{
                        width: "100%",
                        padding: "14px 16px 14px 40px",
                        borderRadius: 12,
                        border: "1px solid rgba(168,85,247,0.25)",
                        background: "rgba(168,85,247,0.06)",
                        color: "#fff",
                        fontSize: 16,
                        fontFamily: "monospace",
                        letterSpacing: "0.1em",
                        outline: "none",
                        boxSizing: "border-box",
                        transition: "border-color 0.2s, box-shadow 0.2s",
                      }}
                      onFocus={e => {
                        e.currentTarget.style.borderColor = "rgba(168,85,247,0.6)";
                        e.currentTarget.style.boxShadow = "0 0 0 3px rgba(168,85,247,0.1)";
                      }}
                      onBlur={e => {
                        e.currentTarget.style.borderColor = "rgba(168,85,247,0.25)";
                        e.currentTarget.style.boxShadow = "none";
                      }}
                    />
                  </div>
                </motion.div>
              </div>

              <motion.button
                type="submit"
                whileHover={!submitting && wallet && code ? { scale: 1.02, boxShadow: "0 0 40px rgba(168,85,247,0.5)" } : {}}
                whileTap={!submitting ? { scale: 0.98 } : {}}
                disabled={submitting || !wallet || !code.trim()}
                style={{
                  width: "100%",
                  padding: "15px 24px",
                  borderRadius: 14,
                  border: "none",
                  background: (!wallet || !code.trim())
                    ? "rgba(255,255,255,0.06)"
                    : "linear-gradient(135deg, #7C3AED 0%, #A855F7 50%, #06B6D4 100%)",
                  color: (!wallet || !code.trim()) ? "rgba(255,255,255,0.3)" : "#fff",
                  fontSize: 15,
                  fontWeight: 800,
                  cursor: submitting || !wallet || !code.trim() ? "not-allowed" : "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 10,
                  transition: "all 0.25s",
                  fontFamily: "var(--font-space-grotesk, sans-serif)",
                  letterSpacing: "0.01em",
                }}
              >
                {submitting ? (
                  <><Loader2 size={18} style={{ animation: "spin 1s linear infinite" }} /> Verifying...</>
                ) : (
                  <>Unlock Access <ArrowRight size={18} /></>
                )}
              </motion.button>

              {!wallet && (
                <p style={{ textAlign: "center", fontSize: 12, color: "rgba(255,255,255,0.3)", marginTop: 12 }}>
                  Connect your wallet using the button in the top right corner first.
                </p>
              )}
            </form>
          )}
        </div>

        {/* Footer text */}
        <p style={{ textAlign: "center", fontSize: 12, color: "rgba(255,255,255,0.2)", marginTop: 20, lineHeight: 1.6 }}>
          WAGR Testnet · Base Sepolia · Invite only beta
        </p>
      </motion.div>

      <style>{`
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
}
