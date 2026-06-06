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
  Crypto: "#9B5CFF", Politics: "#f59e0b", Sports: "#22d3ee",
  Tech: "#00FF88", Macro: "#f472b6", Entertainment: "#fb923c",
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
        style={{ position: "fixed", inset: 0, zIndex: 1000, background: "rgba(0,0,0,0.75)", backdropFilter: "blur(6px)" }}
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
            background: "linear-gradient(160deg, #13131f 0%, #0d0d18 100%)",
            border: `1px solid ${clr}30`,
            borderRadius: 24,
            padding: "28px 28px 24px",
            boxShadow: `0 0 80px ${clr}18, 0 32px 80px rgba(0,0,0,0.6)`,
            display: "flex", flexDirection: "column", gap: 20,
          }}
        >
        {/* Close */}
        <button onClick={onClose} style={{ position: "absolute", top: 16, right: 16, background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8, width: 32, height: 32, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", color: "rgba(255,255,255,0.5)" }}>
          <X size={15} />
        </button>

        {/* Header */}
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
            <span style={{ fontSize: 10, fontFamily: "monospace", padding: "3px 10px", borderRadius: 99, background: `${clr}18`, border: `1px solid ${clr}35`, color: clr }}>
              {category}
            </span>
            <span style={{ fontSize: 10, fontFamily: "monospace", color: "rgba(255,255,255,0.2)" }}>Market #{marketId}</span>
          </div>
          <p style={{ fontSize: 15, fontWeight: 700, color: "rgba(255,255,255,0.9)", lineHeight: 1.45, margin: 0 }}>{question}</p>
        </div>

        {/* Live Pool Bar */}
        <div>
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, fontFamily: "monospace", color: "rgba(255,255,255,0.3)", marginBottom: 7 }}>
            <span>YES <strong style={{ color: "#00FF88" }}>{yP}%</strong></span>
            <span style={{ color: "rgba(255,255,255,0.4)" }}>Pool: <strong style={{ color: "rgba(255,255,255,0.6)" }}>${(yesPool + noPool).toLocaleString("en", { maximumFractionDigits: 2 })}</strong></span>
            <span>NO <strong style={{ color: "#f87171" }}>{100 - yP}%</strong></span>
          </div>
          <div style={{ height: 6, background: "rgba(255,255,255,0.06)", borderRadius: 99, overflow: "hidden", display: "flex" }}>
            <div style={{ width: `${yP}%`, background: "linear-gradient(90deg,#00FF88,#34d399)", transition: "width 0.5s" }} />
            <div style={{ width: `${100 - yP}%`, background: "linear-gradient(90deg,#f87171,#ef4444)", transition: "width 0.5s" }} />
          </div>
        </div>

        {/* Side Selector */}
        <div>
          <p style={{ fontSize: 11, fontFamily: "monospace", color: "rgba(255,255,255,0.3)", marginBottom: 8, textTransform: "uppercase", letterSpacing: "0.1em" }}>Your Prediction</p>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
            {([0, 1] as const).map(s => (
              <button key={s} onClick={() => setSide(s)} style={{
                padding: "14px 0", borderRadius: 14, fontSize: 14, fontWeight: 800,
                fontFamily: "monospace", cursor: "pointer", transition: "all 0.18s",
                background: side === s
                  ? (s === 0 ? "rgba(0,255,136,0.15)" : "rgba(248,113,113,0.15)")
                  : "rgba(255,255,255,0.03)",
                border: side === s
                  ? (s === 0 ? "1px solid rgba(0,255,136,0.5)" : "1px solid rgba(248,113,113,0.5)")
                  : "1px solid rgba(255,255,255,0.08)",
                color: side === s ? (s === 0 ? "#00FF88" : "#f87171") : "rgba(255,255,255,0.3)",
                boxShadow: side === s ? (s === 0 ? "0 0 20px rgba(0,255,136,0.12)" : "0 0 20px rgba(248,113,113,0.12)") : "none",
              }}>
                {s === 0 ? "✅ YES" : "❌ NO"}
                <div style={{ fontSize: 10, fontWeight: 400, marginTop: 3, opacity: 0.7 }}>{s === 0 ? yP : 100 - yP}% chance</div>
              </button>
            ))}
          </div>
        </div>

        {/* Amount */}
        <div>
          <p style={{ fontSize: 11, fontFamily: "monospace", color: "rgba(255,255,255,0.3)", marginBottom: 8, textTransform: "uppercase", letterSpacing: "0.1em" }}>Bet Amount (USDC)</p>
          <div style={{ position: "relative", marginBottom: 10 }}>
            <span style={{ position: "absolute", left: 16, top: "50%", transform: "translateY(-50%)", fontSize: 15, color: "rgba(255,255,255,0.4)", fontFamily: "monospace", pointerEvents: "none" }}>$</span>
            <input
              type="number" min={1} value={inputStr}
              onChange={e => { setInputStr(e.target.value); setAmount(Number(e.target.value) || 0); }}
              onFocus={e => e.target.style.borderColor = `${clr}60`}
              onBlur={e => e.target.style.borderColor = "rgba(255,255,255,0.1)"}
              style={{ width: "100%", padding: "13px 16px 13px 32px", borderRadius: 12, fontSize: 16, fontWeight: 700,
                fontFamily: "monospace", background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.1)",
                color: "#fff", outline: "none", boxSizing: "border-box", transition: "border-color 0.2s" }}
            />
          </div>
          <div style={{ display: "flex", gap: 6 }}>
            {QUICK_AMOUNTS.map(v => (
              <button key={v} onClick={() => { setAmount(v); setInputStr(String(v)); }}
                style={{ flex: 1, padding: "7px 0", borderRadius: 8, fontSize: 11, fontFamily: "monospace", cursor: "pointer", transition: "all 0.15s",
                  background: amount === v ? `${clr}18` : "rgba(255,255,255,0.03)",
                  border:     amount === v ? `1px solid ${clr}45` : "1px solid rgba(255,255,255,0.07)",
                  color:      amount === v ? clr : "rgba(255,255,255,0.35)",
                }}>
                ${v}
              </button>
            ))}
          </div>
        </div>

        {/* Payout Preview */}
        <div style={{ padding: "12px 16px", borderRadius: 12, background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <TrendingUp size={13} color={clr} />
            <span style={{ fontSize: 12, fontFamily: "monospace", color: "rgba(255,255,255,0.4)" }}>Est. Payout if you win</span>
          </div>
          <div style={{ textAlign: "right" }}>
            <span style={{ fontSize: 16, fontWeight: 800, fontFamily: "monospace", color: clr }}>${payout.toFixed(2)}</span>
            <span style={{ fontSize: 10, fontFamily: "monospace", color: "rgba(255,255,255,0.25)", marginLeft: 6 }}>{multiplier}x</span>
          </div>
        </div>

        {/* Error */}
        {step === "error" && (
          <div style={{ padding: "10px 14px", borderRadius: 10, background: "rgba(248,113,113,0.08)", border: "1px solid rgba(248,113,113,0.25)", fontSize: 12, color: "#f87171", lineHeight: 1.5 }}>
            {errMsg}
          </div>
        )}

        {/* Success */}
        {step === "done" ? (
          <div style={{ textAlign: "center", padding: "16px 0" }}>
            <div style={{ fontSize: 40, marginBottom: 8 }}>🎉</div>
            <p style={{ fontSize: 15, fontWeight: 700, color: "#00FF88", margin: "0 0 4px" }}>Bet Placed!</p>
            <p style={{ fontSize: 12, color: "rgba(255,255,255,0.4)", margin: "0 0 16px", fontFamily: "monospace" }}>You bet ${amount} on {side === 0 ? "YES" : "NO"}</p>
            <button onClick={onClose} style={{ padding: "11px 28px", borderRadius: 12, fontWeight: 700, fontSize: 13, color: "#fff", background: "linear-gradient(135deg,#7C3AED,#9B5CFF)", border: "none", cursor: "pointer" }}>
              Close
            </button>
          </div>
        ) : (
          <button
            onClick={handleBet}
            disabled={isLoading || !account || amount < 1}
            style={{
              padding: "15px", borderRadius: 14, fontWeight: 800, fontSize: 15, letterSpacing: "0.04em",
              color: "#fff", border: "none", cursor: isLoading || !account || amount < 1 ? "not-allowed" : "pointer",
              background: isLoading ? "rgba(124,58,237,0.4)" : `linear-gradient(135deg, ${side === 0 ? "#059669, #00FF88" : "#dc2626, #f87171"})`,
              boxShadow: isLoading ? "none" : `0 0 32px ${side === 0 ? "rgba(0,255,136,0.3)" : "rgba(248,113,113,0.3)"}`,
              opacity: !account || amount < 1 ? 0.6 : 1,
              transition: "all 0.2s", display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
            }}
          >
            <Zap size={16} fill="white" />
            {!account         ? "Connect Wallet First"
            : step === "approving" ? "⏳ Approving USDC..."
            : step === "betting"   ? "⏳ Placing Bet..."
            : `Place ${side === 0 ? "YES" : "NO"} Bet — $${amount}`}
          </button>
        )}

        {!account && (
          <p style={{ fontSize: 11, color: "rgba(255,255,255,0.2)", textAlign: "center", fontFamily: "monospace", margin: 0 }}>
            Connect wallet via the header to place bets
          </p>
        )}
      </motion.div>
      </div>
    </AnimatePresence>
  );
}
