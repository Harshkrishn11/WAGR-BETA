"use client";

import React, { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useActiveAccount, useSendTransaction } from "thirdweb/react";
import { prepareContractCall, getContract, readContract, waitForReceipt } from "thirdweb";
import { client } from "@/lib/thirdweb";
import { activeChain, PREDICTION_MARKET_ADDRESS, USDC_ADDRESS, ERC20_ABI } from "@/lib/contracts";
import PREDICTION_MARKET_ABI from "@/lib/WagrPredictionMarket.json";
import { X, TrendingUp, Zap } from "lucide-react";

interface BetModalProps {
  marketId: number;
  question: string;
  category: string;
  initialSide: 0 | 1; // 0=YES, 1=NO
  onClose: () => void;
}

const QUICK_AMOUNTS = [5, 10, 25, 50, 100];

const CATCLR: Record<string, string> = {
  Crypto: "#9B5CFF", Politics: "#f59e0b", Sports: "#0891B2",
  Tech: "#059669", Macro: "#DB2777", Entertainment: "#fb923c",
  Science: "#34d399", Others: "#9ca3af",
};

export default function BetModal({ marketId, question, category, initialSide, onClose }: BetModalProps) {
  const account = useActiveAccount();
  const { mutate: sendTx } = useSendTransaction();

  const [side, setSide]       = useState<0 | 1>(initialSide);
  const [amount, setAmount]   = useState(10);
  const [inputStr, setInputStr] = useState("10");
  const [step, setStep]       = useState<"idle" | "approving" | "betting" | "done" | "error">("idle");
  const [errMsg, setErrMsg]   = useState("");
  const [yesPool, setYesPool] = useState(0);
  const [noPool, setNoPool]   = useState(0);

  const clr = CATCLR[category] ?? "#9B5CFF";
  const total = yesPool + noPool;
  const yP = total > 0 ? Math.round((yesPool / total) * 100) : 50;

  // Payout multiplier
  const myPool   = side === 0 ? yesPool : noPool;
  const myContrib = amount * 1e6;
  const newTotal  = total * 1e6 + myContrib;
  const newMyPool = myPool * 1e6 + myContrib;
  const payout    = newMyPool > 0 ? ((newTotal / newMyPool) * amount) : 0;
  const multiplier = amount > 0 ? (payout / amount).toFixed(2) : "—";

  // Fetch live pool data
  const fetchPools = useCallback(async () => {
    try {
      const contract = getContract({ client, chain: activeChain, address: PREDICTION_MARKET_ADDRESS!, abi: PREDICTION_MARKET_ABI as any });
      const [y, n] = await Promise.all([
        readContract({ contract, method: "getOptionPool", params: [BigInt(marketId), 0] }),
        readContract({ contract, method: "getOptionPool", params: [BigInt(marketId), 1] }),
      ]);
      setYesPool(Number(y) / 1e6);
      setNoPool(Number(n) / 1e6);
    } catch {}
  }, [marketId]);

  useEffect(() => { fetchPools(); }, [fetchPools]);

  async function handleBet() {
    if (!account) { setErrMsg("Please connect your wallet first."); setStep("error"); return; }
    if (isNaN(amount) || amount < 1) { setErrMsg("Minimum bet is $1 USDC."); setStep("error"); return; }

    const amtBig = BigInt(Math.floor(amount * 1_000_000));
    const usdcContract   = getContract({ client, chain: activeChain, address: USDC_ADDRESS, abi: ERC20_ABI });
    const marketContract = getContract({ client, chain: activeChain, address: PREDICTION_MARKET_ADDRESS!, abi: PREDICTION_MARKET_ABI as any });

    try {
      // 1. Check current allowance
      setStep("approving");
      const currentAllowance = await readContract({
        contract: usdcContract,
        method: "allowance",
        params: [account.address, PREDICTION_MARKET_ADDRESS!],
      }) as bigint;

      if (currentAllowance < amtBig) {
        let approveTxHash: `0x${string}` = "0x";
        await new Promise<void>((res, rej) => {
          sendTx(
            prepareContractCall({ contract: usdcContract, method: "approve", params: [PREDICTION_MARKET_ADDRESS!, amtBig] }),
            { onSuccess: (result: any) => { approveTxHash = result?.transactionHash ?? "0x"; res(); }, onError: (e) => rej(e) }
          );
        });

        if (approveTxHash && approveTxHash !== "0x") {
          await waitForReceipt({ client, chain: activeChain, transactionHash: approveTxHash });
        } else {
          await new Promise(resolve => setTimeout(resolve, 4000));
        }
      }

      setStep("betting");
      let betTxHash: `0x${string}` = "0x";
      await new Promise<void>((res, rej) => {
        sendTx(
          prepareContractCall({ contract: marketContract, method: "placeBet", params: [BigInt(marketId), side, amtBig] }),
          { onSuccess: (result: any) => { betTxHash = result?.transactionHash ?? "0x"; res(); }, onError: (e) => rej(e) }
        );
      });

      if (betTxHash && betTxHash !== "0x") {
        await waitForReceipt({ client, chain: activeChain, transactionHash: betTxHash });
      }

      setStep("done");
      fetchPools();
    } catch (e: any) {
      setErrMsg(e?.message?.slice(0, 120) ?? "Transaction failed.");
      setStep("error");
    }
  }

  const isLoading = step === "approving" || step === "betting";

  return (
    <AnimatePresence>
      {/* Backdrop */}
      <motion.div
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        onClick={onClose}
        style={{ position: "fixed", inset: 0, zIndex: 1000, background: "rgba(0,0,0,0.4)", backdropFilter: "blur(8px)" }}
      />

      {/* Modal Wrapper */}
      <div style={{ position: "fixed", inset: 0, zIndex: 1001, display: "flex", alignItems: "center", justifyContent: "center", pointerEvents: "none", padding: "16px" }}>
        <motion.div
          initial={{ opacity: 0, y: 40, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 20, scale: 0.96 }}
          transition={{ type: "spring", stiffness: 380, damping: 30 }}
          style={{
            pointerEvents: "auto",
            width: "min(480px, 100%)",
            maxHeight: "90vh", overflowY: "auto",
            background: "#ffffff",
            border: "1px solid #e5e7eb",
            borderRadius: 24,
            padding: "32px",
            boxShadow: "0 20px 40px rgba(0,0,0,0.08)",
            display: "flex", flexDirection: "column", gap: 24,
          }}
        >
        {/* Close */}
        <button onClick={onClose} style={{ position: "absolute", top: 20, right: 20, background: "#f9fafb", border: "1px solid #e5e7eb", borderRadius: 10, width: 36, height: 36, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", color: "#6b7280", transition: "background 0.2s" }} onMouseOver={e => e.currentTarget.style.background = "#e5e7eb"} onMouseOut={e => e.currentTarget.style.background = "#f9fafb"}>
          <X size={18} />
        </button>

        {/* Header */}
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
            <span style={{ fontSize: 11, fontFamily: "monospace", padding: "4px 10px", borderRadius: 99, background: `${clr}15`, border: `1px solid ${clr}30`, color: clr, fontWeight: 700 }}>
              {category}
            </span>
            <span style={{ fontSize: 11, fontFamily: "monospace", color: "#9ca3af", fontWeight: 600 }}>Market #{marketId}</span>
          </div>
          <p style={{ fontSize: 18, fontWeight: 800, color: "#111827", lineHeight: 1.4, margin: 0, fontFamily: "var(--font-space-grotesk,sans-serif)" }}>{question}</p>
        </div>

        {/* Live Pool Bar */}
        <div style={{ padding: 20, background: "#f9fafb", borderRadius: 16, border: "1px solid #e5e7eb" }}>
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, fontFamily: "monospace", color: "#6b7280", marginBottom: 10, fontWeight: 600 }}>
            <span>YES <strong style={{ color: "#16a34a" }}>{yP}%</strong></span>
            <span>Pool: <strong style={{ color: "#111827" }}>${(yesPool + noPool).toLocaleString("en", { maximumFractionDigits: 2 })}</strong></span>
            <span>NO <strong style={{ color: "#DC2626" }}>{100 - yP}%</strong></span>
          </div>
          <div style={{ height: 8, background: "#e5e7eb", borderRadius: 99, overflow: "hidden", display: "flex" }}>
            <div style={{ width: `${yP}%`, background: "linear-gradient(90deg,#16a34a,#34d399)", transition: "width 0.5s" }} />
            <div style={{ width: `${100 - yP}%`, background: "linear-gradient(90deg,#f87171,#ef4444)", transition: "width 0.5s" }} />
          </div>
        </div>

        {/* Side Selector */}
        <div>
          <p style={{ fontSize: 12, fontFamily: "monospace", color: "#6b7280", marginBottom: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em" }}>Your Prediction</p>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            {([0, 1] as const).map(s => (
              <button key={s} onClick={() => setSide(s)} style={{
                padding: "16px 0", borderRadius: 16, fontSize: 15, fontWeight: 800,
                fontFamily: "monospace", cursor: "pointer", transition: "all 0.2s",
                background: side === s
                  ? (s === 0 ? "rgba(22,163,74,0.1)" : "rgba(220,38,38,0.1)")
                  : "#ffffff",
                border: side === s
                  ? (s === 0 ? "2px solid #16a34a" : "2px solid #DC2626")
                  : "1px solid #e5e7eb",
                color: side === s ? (s === 0 ? "#16a34a" : "#DC2626") : "#9ca3af",
              }}>
                {s === 0 ? "✅ YES" : "❌ NO"}
                <div style={{ fontSize: 11, fontWeight: 600, marginTop: 4, opacity: side === s ? 0.9 : 0.6 }}>{s === 0 ? yP : 100 - yP}% chance</div>
              </button>
            ))}
          </div>
        </div>

        {/* Amount */}
        <div>
          <p style={{ fontSize: 12, fontFamily: "monospace", color: "#6b7280", marginBottom: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em" }}>Bet Amount (USDC)</p>
          <div style={{ position: "relative", marginBottom: 12 }}>
            <span style={{ position: "absolute", left: 20, top: "50%", transform: "translateY(-50%)", fontSize: 18, color: "#9ca3af", fontFamily: "monospace", pointerEvents: "none", fontWeight: 700 }}>$</span>
            <input
              type="number" min={1} value={inputStr}
              onChange={e => { setInputStr(e.target.value); setAmount(Number(e.target.value) || 0); }}
              onFocus={e => e.target.style.borderColor = clr}
              onBlur={e => e.target.style.borderColor = "#e5e7eb"}
              style={{ width: "100%", padding: "16px 16px 16px 40px", borderRadius: 16, fontSize: 18, fontWeight: 800,
                fontFamily: "monospace", background: "#f9fafb", border: "1px solid #e5e7eb",
                color: "#111827", outline: "none", boxSizing: "border-box", transition: "border-color 0.2s" }}
            />
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            {QUICK_AMOUNTS.map(v => (
              <button key={v} onClick={() => { setAmount(v); setInputStr(String(v)); }}
                style={{ flex: 1, padding: "8px 0", borderRadius: 10, fontSize: 13, fontFamily: "monospace", cursor: "pointer", transition: "all 0.15s",
                  background: amount === v ? `${clr}15` : "#ffffff",
                  border:     amount === v ? `1px solid ${clr}50` : "1px solid #e5e7eb",
                  color:      amount === v ? clr : "#6b7280",
                  fontWeight: amount === v ? 700 : 500
                }}>
                ${v}
              </button>
            ))}
          </div>
        </div>

        {/* Payout Preview */}
        <div style={{ padding: "16px 20px", borderRadius: 16, background: "#f9fafb", border: "1px solid #e5e7eb", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <TrendingUp size={16} color={clr} />
            <span style={{ fontSize: 13, fontFamily: "monospace", color: "#6b7280", fontWeight: 600 }}>Est. Payout if you win</span>
          </div>
          <div style={{ textAlign: "right" }}>
            <span style={{ fontSize: 18, fontWeight: 800, fontFamily: "monospace", color: clr }}>${payout.toFixed(2)}</span>
            <span style={{ fontSize: 11, fontFamily: "monospace", color: "#9ca3af", marginLeft: 8, fontWeight: 600 }}>{multiplier}x</span>
          </div>
        </div>

        {/* Error */}
        {step === "error" && (
          <div style={{ padding: "12px 16px", borderRadius: 12, background: "rgba(220,38,38,0.1)", border: "1px solid rgba(220,38,38,0.2)", fontSize: 13, color: "#DC2626", lineHeight: 1.5, fontWeight: 600 }}>
            {errMsg}
          </div>
        )}

        {/* Success */}
        {step === "done" ? (
          <div style={{ textAlign: "center", padding: "20px 0" }}>
            <div style={{ fontSize: 48, marginBottom: 12 }}>🎉</div>
            <p style={{ fontSize: 18, fontWeight: 800, color: "#16a34a", margin: "0 0 8px" }}>Bet Placed!</p>
            <p style={{ fontSize: 14, color: "#6b7280", margin: "0 0 24px", fontFamily: "monospace" }}>You bet <strong style={{ color: "#111827" }}>${amount}</strong> on <strong style={{ color: side === 0 ? "#16a34a" : "#DC2626" }}>{side === 0 ? "YES" : "NO"}</strong></p>
            <button onClick={onClose} style={{ padding: "14px 32px", borderRadius: 14, fontWeight: 800, fontSize: 15, color: "#fff", background: "#111827", border: "none", cursor: "pointer", width: "100%" }}>
              Close
            </button>
          </div>
        ) : (
          <button
            onClick={handleBet}
            disabled={isLoading || !account || amount < 1}
            style={{
              padding: "18px", borderRadius: 16, fontWeight: 800, fontSize: 16, letterSpacing: "0.02em",
              color: "#fff", border: "none", cursor: isLoading || !account || amount < 1 ? "not-allowed" : "pointer",
              background: (!account || amount < 1) ? "#e5e7eb" : isLoading ? "rgba(124,58,237,0.5)" : `linear-gradient(135deg, ${side === 0 ? "#16a34a, #22c55e" : "#DC2626, #ef4444"})`,
              boxShadow: (!account || amount < 1 || isLoading) ? "none" : `0 8px 24px ${side === 0 ? "rgba(22,163,74,0.3)" : "rgba(220,38,38,0.3)"}`,
              transition: "all 0.2s", display: "flex", alignItems: "center", justifyContent: "center", gap: 10,
            }}
          >
            <Zap size={18} fill={(!account || amount < 1) ? "#9ca3af" : "white"} color={(!account || amount < 1) ? "#9ca3af" : "white"} />
            {!account         ? "Connect Wallet First"
            : step === "approving" ? "⏳ Approving USDC..."
            : step === "betting"   ? "⏳ Placing Bet..."
            : `Place ${side === 0 ? "YES" : "NO"} Bet — $${amount}`}
          </button>
        )}

        {!account && (
          <p style={{ fontSize: 12, color: "#9ca3af", textAlign: "center", fontFamily: "monospace", margin: 0 }}>
            Connect wallet via the header to place bets
          </p>
        )}
      </motion.div>
      </div>
    </AnimatePresence>
  );
}
