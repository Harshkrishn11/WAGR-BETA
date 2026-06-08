"use client";

import React, { useState } from "react";
import { motion } from "framer-motion";
import Link from "next/link";
import { useActiveAccount, useSendTransaction, useReadContract } from "thirdweb/react";
import { prepareContractCall, getContract, readContract, waitForReceipt } from "thirdweb";
import { client } from "@/lib/thirdweb";
import { activeChain, USDC_ADDRESS, PREDICTION_MARKET_ADDRESS, ERC20_ABI } from "@/lib/contracts";
import PREDICTION_MARKET_ABI from "@/lib/WagrPredictionMarket.json";
import { Info, ArrowLeft, PlusCircle, Sparkles, Link as LinkIcon } from "lucide-react";

/* ─── Constants ─────────────────────────────────────────────── */
const MIN_SEED_USDC = 5; // $5 minimum
const CATEGORIES = ["Crypto", "Politics", "Sports", "Tech", "Macro", "Entertainment", "Science", "Others"];

function fadeUp(delay = 0) {
  return {
    initial: { opacity: 0, y: 24 },
    animate: { opacity: 1, y: 0 },
    transition: { duration: 0.45, delay },
  };
}

/* ─── Input Component ──────────────────────────────────────── */
function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <label style={{ fontSize: 13, fontWeight: 600, color: "#4b5563" }}>{label}</label>
        {hint && (
          <span title={hint} style={{ display: "inline-flex", cursor: "help", color: "#9ca3af" }}>
            <Info size={13} />
          </span>
        )}
      </div>
      {children}
    </div>
  );
}

const inputStyle: React.CSSProperties = {
  width: "100%",
  padding: "12px 16px",
  borderRadius: 12,
  border: "1px solid #e5e7eb",
  background: "#f9fafb",
  color: "#111827",
  fontSize: 14,
  fontFamily: "Inter, sans-serif",
  outline: "none",
  boxSizing: "border-box",
  transition: "border-color 0.2s, box-shadow 0.2s",
};

/* ═══════════════════════════════════════════════════════════════
   PAGE
═══════════════════════════════════════════════════════════════ */
export default function CreateMarketPage() {
  const account = useActiveAccount();
  const { mutate: sendTx, isPending } = useSendTransaction();

  const [question, setQuestion]   = useState("");
  const [category, setCategory]   = useState("Crypto");
  const [daysOpen, setDaysOpen]   = useState(7);
  const [seedSide, setSeedSide]   = useState<0 | 1>(0); // 0=YES, 1=NO
  const [seedAmt, setSeedAmt]     = useState(5);
  const [step, setStep]           = useState<"form" | "approving" | "creating" | "done" | "error">("form");
  const [errorMsg, setErrorMsg]   = useState("");
  const [txHash, setTxHash]       = useState("");
  const [createdMarketId, setCreatedMarketId] = useState<number | null>(null);

  const marketContract = getContract({
    client,
    chain: activeChain,
    address: PREDICTION_MARKET_ADDRESS!,
    abi: PREDICTION_MARKET_ABI as any,
  });

  const usdcContract = getContract({
    client,
    chain: activeChain,
    address: USDC_ADDRESS,
    abi: ERC20_ABI,
  });

  const { data: countData } = useReadContract({ contract: marketContract, method: "nextMarketId", params: [] } as any);
  const nextMarketId = countData ? Number(countData) : 0;

  async function handleCreate() {
    if (!account) { setErrorMsg("Please connect your wallet first."); setStep("error"); return; }
    if (!question.trim()) { setErrorMsg("Please enter a market question."); setStep("error"); return; }
    
    // Ensure it's a binary YES/NO question
    const qLower = question.trim().toLowerCase();
    const startsWithValidWord = /^(will|is|are|does|do|did|can|could|would|should|has|have)\b/.test(qLower);
    if (!startsWithValidWord) {
      setErrorMsg("Questions must be phrased as a YES/NO question (e.g., 'Will...', 'Is...', 'Does...').");
      setStep("error");
      return;
    }

    if (seedAmt < MIN_SEED_USDC) { setErrorMsg(`Minimum seed is $${MIN_SEED_USDC} USDC.`); setStep("error"); return; }

    const deadline   = Math.floor(Date.now() / 1000) + daysOpen * 86400;
    const seedBigInt = BigInt(Math.round(seedAmt * 1_000_000)); // 6 decimals
    setCreatedMarketId(nextMarketId);

    try {
      // Step 1 — Approve USDC
      setStep("approving");
      const approveTx = prepareContractCall({
        contract: usdcContract,
        method:   "approve",
        params:   [PREDICTION_MARKET_ADDRESS!, seedBigInt],
      });
      let approveTxHash: `0x${string}` = "0x";
      await new Promise<void>((resolve, reject) => {
        sendTx(approveTx, {
          onSuccess: (result: any) => { approveTxHash = result?.transactionHash ?? "0x"; resolve(); },
          onError:   (e) => reject(e),
        });
      });

      // Wait for approve to be MINED (not just submitted)
      if (approveTxHash && approveTxHash !== "0x") {
        await waitForReceipt({ client, chain: activeChain, transactionHash: approveTxHash });
      } else {
        await new Promise(resolve => setTimeout(resolve, 6000));
      }

      // Step 2 — Create Market
      setStep("creating");
      const createTx = prepareContractCall({
        contract: marketContract,
        method:   "createMarket",
        params:   [question.trim(), category, ["YES", "NO"], BigInt(deadline), seedSide, seedBigInt],
      });
      let createTxHash: `0x${string}` = "0x";
      await new Promise<void>((resolve, reject) => {
        sendTx(createTx, {
          onSuccess: (res: any) => { createTxHash = res?.transactionHash ?? "0x"; setTxHash(res?.transactionHash ?? ""); resolve(); },
          onError:   (e)   => reject(e),
        });
      });

      // Wait for create tx to be MINED then read the actual market ID from chain
      if (createTxHash && createTxHash !== "0x") {
        await waitForReceipt({ client, chain: activeChain, transactionHash: createTxHash });
      } else {
        await new Promise(resolve => setTimeout(resolve, 6000));
      }
      // After confirmation, fetch fresh nextMarketId — the new market is at (newCount - 1)
      const freshCount = await readContract({ contract: marketContract, method: "nextMarketId", params: [] }) as bigint;
      setCreatedMarketId(Number(freshCount) - 1);

      setStep("done");
    } catch (e: any) {
      setErrorMsg(e?.message ?? "Transaction failed. Please try again.");
      setStep("error");
    }
  }

  /* ── Success ── */
  if (step === "done") {
    return (
      <main style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", padding: 24, background: "#ffffff" }}>
        <motion.div {...fadeUp(0)}
          style={{ maxWidth: 480, width: "100%", textAlign: "center", padding: "48px 32px", borderRadius: 24, border: "1px solid rgba(22,163,74,0.3)", background: "rgba(22,163,74,0.06)", boxShadow: "0 4px 24px rgba(22,163,74,0.08)" }}>
          <div style={{ width: 72, height: 72, borderRadius: "50%", background: "rgba(22,163,74,0.1)", border: "1px solid rgba(22,163,74,0.3)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 24px" }}>
            <Sparkles size={32} color="#16a34a" />
          </div>
          <h1 style={{ fontSize: 26, fontWeight: 800, color: "#111827", margin: "0 0 12px", fontFamily: "var(--font-space-grotesk,sans-serif)" }}>Market Created! 🎉</h1>
          <p style={{ fontSize: 14, color: "#4b5563", lineHeight: 1.7, margin: "0 0 8px" }}>
            Your market is now live on-chain. Share it everywhere — you earn <strong style={{ color: "#16a34a" }}>2% of all volume</strong> when it resolves!
          </p>
          {txHash && (
            <a href={`https://sepolia.basescan.org/tx/${txHash}`} target="_blank" rel="noopener noreferrer"
              style={{ display: "inline-block", fontSize: 11, fontFamily: "monospace", color: "#7C3AED", marginBottom: 20, textDecoration: "underline" }}>
              View on BaseScan ↗
            </a>
          )}

          <div style={{ marginBottom: 28 }}>
            <button onClick={() => {
              navigator.clipboard.writeText(`${window.location.origin}/markets/${createdMarketId ?? ""}`);
              alert("Share Link Copied! Send it to your friends to get bets on your market.");
            }}
              style={{ padding: "10px 20px", borderRadius: 99, fontWeight: 700, fontSize: 13, color: "#16a34a", background: "rgba(22,163,74,0.1)", border: "1px solid rgba(22,163,74,0.3)", cursor: "pointer", display: "inline-flex", alignItems: "center", gap: 6, transition: "all 0.2s" }}
              onMouseEnter={e => e.currentTarget.style.background = "rgba(22,163,74,0.15)"}
              onMouseLeave={e => e.currentTarget.style.background = "rgba(22,163,74,0.1)"}
            >
              <LinkIcon size={14} /> Copy Share Link
            </button>
          </div>

          <div style={{ display: "flex", gap: 10, justifyContent: "center", flexWrap: "wrap" }}>
            <Link href="/">
              <button style={{ padding: "11px 24px", borderRadius: 12, fontWeight: 700, fontSize: 13, color: "#fff", background: "linear-gradient(135deg,#7C3AED,#9B5CFF)", border: "none", cursor: "pointer", boxShadow: "0 4px 12px rgba(124,58,237,0.2)" }}>
                View Markets
              </button>
            </Link>
            <button onClick={() => { setStep("form"); setQuestion(""); setSeedAmt(5); }}
              style={{ padding: "11px 24px", borderRadius: 12, fontWeight: 700, fontSize: 13, color: "#4b5563", background: "#f9fafb", border: "1px solid #e5e7eb", cursor: "pointer", boxShadow: "0 1px 3px rgba(0,0,0,0.05)" }}>
              Create Another
            </button>
          </div>
        </motion.div>
      </main>
    );
  }

  /* ── Main Form ── */
  const isLoading = step === "approving" || step === "creating";
  const yP = 50; // placeholder odds for preview

  return (
    <main style={{ minHeight: "100vh", padding: "80px 24px 80px", background: "#ffffff" }}>
      <div style={{ maxWidth: 1100, margin: "0 auto" }}>
        
        {/* Back */}
        <motion.div {...fadeUp(0)}>
          <Link href="/" style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 13, color: "#6b7280", textDecoration: "none", marginBottom: 40 }}
            onMouseEnter={e => (e.currentTarget.style.color = "#111827")} onMouseLeave={e => (e.currentTarget.style.color = "#6b7280")}>
            <ArrowLeft size={14} /> Back to Markets
          </Link>
        </motion.div>

        {/* Header */}
        <motion.div {...fadeUp(0.05)} style={{ marginBottom: 40 }}>
          <div style={{ display: "inline-flex", alignItems: "center", gap: 8, padding: "5px 14px", borderRadius: 99, border: "1px solid rgba(124,58,237,0.3)", background: "rgba(124,58,237,0.08)", marginBottom: 16 }}>
            <PlusCircle size={12} color="#7C3AED" />
            <span style={{ fontSize: 11, fontFamily: "monospace", letterSpacing: "0.12em", textTransform: "uppercase", color: "#7C3AED", fontWeight: 700 }}>Creator Dashboard</span>
          </div>
          <h1 style={{ fontSize: "clamp(2rem,5vw,3.2rem)", fontWeight: 800, color: "#111827", margin: "0 0 12px", fontFamily: "var(--font-space-grotesk,sans-serif)", letterSpacing: "-0.02em" }}>
            Create a Market
          </h1>
          <p style={{ fontSize: 15, color: "#6b7280", maxWidth: 520, lineHeight: 1.65, margin: 0 }}>
            Seed your market, share it everywhere, and earn <span style={{ color: "#16a34a", fontWeight: 700 }}>2% of all volume</span> when it resolves.
          </p>
        </motion.div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 380px", gap: 28, alignItems: "start" }}>
          
          {/* ─── Left: Form ──────────────────────────────────────── */}
          <motion.div {...fadeUp(0.1)} style={{ display: "flex", flexDirection: "column", gap: 20, padding: "28px 28px", borderRadius: 24, border: "1px solid #e5e7eb", background: "#ffffff", boxShadow: "0 4px 24px rgba(0,0,0,0.04)" }}>

            <Field label="Market Question" hint="Write a clear YES/NO question about a future event.">
              <textarea
                value={question}
                onChange={e => setQuestion(e.target.value)}
                placeholder='e.g. "Will BTC surpass $100k before Dec 2025?"'
                rows={3}
                style={{ ...inputStyle, resize: "none", lineHeight: 1.6 }}
                onFocus={e => {
                  e.target.style.borderColor = "#7C3AED";
                  e.target.style.boxShadow = "0 0 0 3px rgba(124,58,237,0.1)";
                }}
                onBlur={e  => {
                  e.target.style.borderColor = "#e5e7eb";
                  e.target.style.boxShadow = "none";
                }}
              />
            </Field>

            <Field label="Category">
              <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                {CATEGORIES.map(cat => (
                  <button key={cat} onClick={() => setCategory(cat)}
                    style={{ padding: "7px 16px", borderRadius: 99, fontSize: 12, fontWeight: 600, fontFamily: "monospace", cursor: "pointer", transition: "all 0.15s",
                      background: category === cat ? "rgba(124,58,237,0.1)" : "#f9fafb",
                      border:     category === cat ? "1px solid rgba(124,58,237,0.4)" : "1px solid #e5e7eb",
                      color:      category === cat ? "#7C3AED" : "#6b7280",
                    }}>
                    {cat}
                  </button>
                ))}
              </div>
            </Field>

            <Field label="Market Duration" hint="How many days should the market stay open for betting?">
              <div style={{ display: "flex", gap: 8 }}>
                {[1, 3, 7, 14, 30].map(d => (
                  <button key={d} onClick={() => setDaysOpen(d)}
                    style={{ flex: 1, padding: "10px 0", borderRadius: 10, fontSize: 12, fontWeight: 600, fontFamily: "monospace", cursor: "pointer", transition: "all 0.15s",
                      background: daysOpen === d ? "rgba(8,145,178,0.1)" : "#f9fafb",
                      border:     daysOpen === d ? "1px solid rgba(8,145,178,0.3)" : "1px solid #e5e7eb",
                      color:      daysOpen === d ? "#0891B2" : "#6b7280",
                    }}>
                    {d}d
                  </button>
                ))}
              </div>
            </Field>

            <Field label="Seed Liquidity (USDC)" hint="Your initial deposit — this is your bet on the market. Min $5.">
              <div style={{ position: "relative" }}>
                <span style={{ position: "absolute", left: 16, top: "50%", transform: "translateY(-50%)", fontSize: 14, color: "#9ca3af", fontFamily: "monospace", pointerEvents: "none" }}>$</span>
                <input type="number" min={5} value={seedAmt} onChange={e => setSeedAmt(Number(e.target.value))}
                  style={{ ...inputStyle, paddingLeft: 28 }}
                  onFocus={e => {
                    e.target.style.borderColor = "#16a34a";
                    e.target.style.boxShadow = "0 0 0 3px rgba(22,163,74,0.1)";
                  }}
                  onBlur={e  => {
                    e.target.style.borderColor = "#e5e7eb";
                    e.target.style.boxShadow = "none";
                  }} />
              </div>
              <div style={{ display: "flex", gap: 8 }}>
                {[5, 10, 25, 50, 100].map(v => (
                  <button key={v} onClick={() => setSeedAmt(v)}
                    style={{ flex: 1, padding: "7px 0", borderRadius: 8, fontSize: 11, fontFamily: "monospace", cursor: "pointer", transition: "all 0.15s",
                      background: seedAmt === v ? "rgba(22,163,74,0.1)" : "#f9fafb",
                      border:     seedAmt === v ? "1px solid rgba(22,163,74,0.3)" : "1px solid #e5e7eb",
                      color:      seedAmt === v ? "#16a34a" : "#6b7280",
                    }}>
                    ${v}
                  </button>
                ))}
              </div>
            </Field>

            <Field label="Your Seed Position" hint="Which side are you betting your seed on?">
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                {([0, 1] as const).map(side => (
                  <button key={side} onClick={() => setSeedSide(side)}
                    style={{ padding: "12px 0", borderRadius: 12, fontSize: 13, fontWeight: 700, fontFamily: "monospace", cursor: "pointer", transition: "all 0.2s",
                      background: seedSide === side ? (side === 0 ? "rgba(22,163,74,0.12)" : "rgba(248,113,113,0.12)") : "#f9fafb",
                      border:     seedSide === side ? (side === 0 ? "1px solid rgba(22,163,74,0.4)" : "1px solid rgba(248,113,113,0.4)") : "1px solid #e5e7eb",
                      color:      seedSide === side ? (side === 0 ? "#16a34a" : "#DC2626") : "#6b7280",
                    }}>
                    {side === 0 ? "✅ YES" : "❌ NO"}
                  </button>
                ))}
              </div>
            </Field>

            {/* Error */}
            {step === "error" && (
              <div style={{ padding: "12px 16px", borderRadius: 12, background: "rgba(248,113,113,0.08)", border: "1px solid rgba(248,113,113,0.25)", fontSize: 13, color: "#DC2626", lineHeight: 1.5 }}>
                {errorMsg}
              </div>
            )}

            {/* Submit */}
            <button onClick={handleCreate} disabled={isLoading || !account}
              style={{ padding: "14px", borderRadius: 14, fontWeight: 700, fontSize: 15, letterSpacing: "0.04em", color: "#fff",
                background:  isLoading ? "rgba(124,58,237,0.5)" : "linear-gradient(135deg,#7C3AED,#9B5CFF)",
                border:      "none",
                cursor:      isLoading || !account ? "not-allowed" : "pointer",
                boxShadow:   isLoading ? "none" : "0 4px 16px rgba(124,58,237,0.3)",
                opacity:     !account ? 0.6 : 1,
                transition:  "all 0.2s",
              }}>
              {!account      ? "Connect Wallet First"
              : step === "approving" ? "⏳ Approving USDC..."
              : step === "creating"  ? "⏳ Creating Market..."
              : `🚀 Create Market & Deposit $${seedAmt}`}
            </button>

            {!account && (
              <p style={{ fontSize: 12, color: "#9ca3af", textAlign: "center", fontFamily: "monospace", margin: 0 }}>
                Connect wallet via the header button to create markets
              </p>
            )}
          </motion.div>

          {/* ─── Right: Info Panel + Preview ─────────────────────── */}
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>

            {/* How you earn */}
            <motion.div {...fadeUp(0.15)} style={{ padding: "22px 22px", borderRadius: 20, border: "1px solid rgba(22,163,74,0.2)", background: "rgba(22,163,74,0.05)" }}>
              <p style={{ fontSize: 11, fontFamily: "monospace", letterSpacing: "0.12em", textTransform: "uppercase", color: "#16a34a", margin: "0 0 14px", fontWeight: 700 }}>💰 How You Earn</p>
              {[
                { label: "Your Seed",      desc: "You deposit USDC to start the pool and take a side (YES or NO)." },
                { label: "You Share It",   desc: "Post on Twitter, Discord, Reddit. The bigger the crowd the bigger your cut." },
                { label: "Market Resolves",desc: "Platform verifies the outcome and resolves the smart contract." },
                { label: "You Get Paid",   desc: "2% of total volume goes directly to your wallet + you win if your side was correct!" },
              ].map((item, i) => (
                <div key={i} style={{ display: "flex", gap: 12, marginBottom: i < 3 ? 14 : 0 }}>
                  <div style={{ width: 22, height: 22, borderRadius: "50%", background: "rgba(22,163,74,0.15)", border: "1px solid rgba(22,163,74,0.3)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10, fontFamily: "monospace", color: "#16a34a", flexShrink: 0, marginTop: 1, fontWeight: 700 }}>
                    {i + 1}
                  </div>
                  <div>
                    <p style={{ fontSize: 13, fontWeight: 600, color: "#111827", margin: "0 0 2px" }}>{item.label}</p>
                    <p style={{ fontSize: 12, color: "#6b7280", margin: 0, lineHeight: 1.5 }}>{item.desc}</p>
                  </div>
                </div>
              ))}
            </motion.div>

            {/* Live Preview Card */}
            <motion.div {...fadeUp(0.2)} style={{ padding: "22px 22px", borderRadius: 20, border: "1px solid rgba(124,58,237,0.2)", background: "#ffffff", boxShadow: "0 4px 16px rgba(124,58,237,0.06)" }}>
              <p style={{ fontSize: 11, fontFamily: "monospace", letterSpacing: "0.12em", textTransform: "uppercase", color: "#9ca3af", margin: "0 0 14px", fontWeight: 700 }}>Preview</p>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
                <span style={{ fontSize: 10, fontFamily: "monospace", padding: "3px 8px", borderRadius: 99, background: "rgba(124,58,237,0.1)", border: "1px solid rgba(124,58,237,0.25)", color: "#7C3AED", fontWeight: 700 }}>{category}</span>
                <span style={{ fontSize: 11, fontFamily: "monospace", color: "#9ca3af" }}>Closes in {daysOpen}d</span>
              </div>
              <p style={{ fontSize: 14, fontWeight: 600, color: question ? "#111827" : "#9ca3af", lineHeight: 1.5, margin: "0 0 14px", minHeight: 42 }}>
                {question || "Your question will appear here..."}
              </p>
              <div style={{ marginBottom: 12 }}>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, fontFamily: "monospace", color: "#6b7280", marginBottom: 6 }}>
                  <span>Pool: <strong style={{ color: "#111827" }}>${seedAmt.toFixed(2)}</strong></span>
                  <span style={{ color: "#16a34a", fontWeight: 700 }}>● Live</span>
                </div>
                <div style={{ height: 5, background: "#f3f4f6", borderRadius: 99, overflow: "hidden", display: "flex" }}>
                  <div style={{ width: `${yP}%`, background: "linear-gradient(90deg,#16a34a,#34d399)" }} />
                  <div style={{ width: `${100 - yP}%`, background: "linear-gradient(90deg,#f87171,#ef4444)" }} />
                </div>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                <div style={{ padding: "8px 0", borderRadius: 10, fontSize: 11, fontWeight: 700, fontFamily: "monospace", color: "#16a34a", background: "rgba(22,163,74,0.08)", border: "1px solid rgba(22,163,74,0.2)", textAlign: "center" }}>YES 50%</div>
                <div style={{ padding: "8px 0", borderRadius: 10, fontSize: 11, fontWeight: 700, fontFamily: "monospace", color: "#DC2626", background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.2)", textAlign: "center" }}>NO 50%</div>
              </div>
            </motion.div>

            {/* Fee Breakdown */}
            <motion.div {...fadeUp(0.25)} style={{ padding: "18px 20px", borderRadius: 18, border: "1px solid #e5e7eb", background: "#f9fafb", fontSize: 12, fontFamily: "monospace" }}>
              <p style={{ color: "#9ca3af", margin: "0 0 10px", letterSpacing: "0.1em", textTransform: "uppercase", fontSize: 10, fontWeight: 700 }}>Fee Structure</p>
              {[
                { label: "You (Creator Fee)", value: "2%", color: "#16a34a" },
                { label: "Platform",          value: "1%", color: "#7C3AED" },
                { label: "Winners take",       value: "97%", color: "#0891B2" },
              ].map(r => (
                <div key={r.label} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                  <span style={{ color: "#6b7280" }}>{r.label}</span>
                  <span style={{ fontWeight: 700, color: r.color }}>{r.value}</span>
                </div>
              ))}
            </motion.div>
          </div>
        </div>
      </div>

      <style>{`
        @media (max-width: 780px) {
          .create-grid { grid-template-columns: 1fr !important; }
        }
      `}</style>
    </main>
  );
}
