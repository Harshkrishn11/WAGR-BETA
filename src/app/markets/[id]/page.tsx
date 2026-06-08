"use client";

import React, { useState, useEffect, useCallback, use } from "react";
import { useActiveAccount, useSendTransaction } from "thirdweb/react";
import { prepareContractCall, getContract, readContract, waitForReceipt } from "thirdweb";
import { client } from "@/lib/thirdweb";
import { activeChain, PREDICTION_MARKET_ADDRESS, USDC_ADDRESS, ERC20_ABI } from "@/lib/contracts";
import PREDICTION_MARKET_ABI from "@/lib/WagrPredictionMarket.json";
import { ArrowLeft, Clock, Zap, TrendingUp, Share, CheckCircle2 } from "lucide-react";
import Link from "next/link";
import { motion } from "framer-motion";

const CATCLR: Record<string, string> = {
  Crypto: "#9B5CFF", Politics: "#f59e0b", Sports: "#0891B2",
  Tech: "#059669", Macro: "#DB2777", Entertainment: "#fb923c",
  Science: "#34d399", Others: "#9ca3af",
};

const QUICK_AMOUNTS = [5, 10, 25, 50, 100];

export default function SingleMarketPage({ params }: { params: Promise<{ id: string }> }) {
  const account = useActiveAccount();
  const { mutate: sendTx } = useSendTransaction();
  const resolvedParams = use(params);
  const marketId = Number(resolvedParams.id);

  // Market Data State
  const [loading, setLoading] = useState(true);
  const [market, setMarket] = useState<any>(null);
  const [yesPool, setYesPool] = useState(0);
  const [noPool, setNoPool] = useState(0);
  const [timeLeft, setTimeLeft] = useState("");

  // Betting State
  const [side, setSide] = useState<0 | 1>(0);
  const [amount, setAmount] = useState(10);
  const [inputStr, setInputStr] = useState("10");
  const [betStep, setBetStep] = useState<"idle" | "approving" | "betting" | "done" | "error">("idle");
  const [errMsg, setErrMsg] = useState("");

  const fetchMarket = useCallback(async () => {
    try {
      if (!PREDICTION_MARKET_ADDRESS) return;
      const contract = getContract({ client, chain: activeChain, address: PREDICTION_MARKET_ADDRESS, abi: PREDICTION_MARKET_ABI as any });
      
      const [m, y, n] = await Promise.all([
        readContract({ contract, method: "getMarket", params: [BigInt(marketId)] }) as any,
        readContract({ contract, method: "getOptionPool", params: [BigInt(marketId), 0] }),
        readContract({ contract, method: "getOptionPool", params: [BigInt(marketId), 1] }),
      ]);
      setMarket(m);
      setYesPool(Number(y) / 1e6);
      setNoPool(Number(n) / 1e6);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [marketId]);

  useEffect(() => {
    fetchMarket();
    const interval = setInterval(fetchMarket, 10000); // refresh every 10s
    return () => clearInterval(interval);
  }, [fetchMarket]);

  useEffect(() => {
    if (!market) return;
    const updateTime = () => {
      const diff = Number(market.deadline) * 1000 - Date.now();
      if (diff <= 0) setTimeLeft("Ended");
      else {
        const d = Math.floor(diff / 86400000);
        const h = Math.floor((diff % 86400000) / 3600000);
        const m = Math.floor((diff % 3600000) / 60000);
        setTimeLeft(d > 0 ? `${d}d ${h}h left` : `${h}h ${m}m left`);
      }
    };
    updateTime();
    const t = setInterval(updateTime, 60000);
    return () => clearInterval(t);
  }, [market]);

  async function handleBet() {
    if (!account) { setErrMsg("Please connect your wallet."); setBetStep("error"); return; }
    if (amount < 1) { setErrMsg("Minimum bet is $1 USDC."); setBetStep("error"); return; }

    if (!PREDICTION_MARKET_ADDRESS) { setErrMsg("Prediction market contract address is not configured."); setBetStep("error"); return; }

    const amtBig = BigInt(Math.round(amount * 1_000_000));
    const usdcContract = getContract({ client, chain: activeChain, address: USDC_ADDRESS, abi: ERC20_ABI });
    const contract = getContract({ client, chain: activeChain, address: PREDICTION_MARKET_ADDRESS, abi: PREDICTION_MARKET_ABI as any });

    try {
      // 1. Check current allowance — skip approve if already sufficient
      setBetStep("approving");
      const currentAllowance = await readContract({
        contract: usdcContract,
        method: "allowance",
        params: [account.address, PREDICTION_MARKET_ADDRESS!],
      }) as bigint;

      if (currentAllowance < amtBig) {
        let approveTxHash: `0x${string}` = "0x";
        await new Promise<void>((res, rej) => {
          sendTx(prepareContractCall({ contract: usdcContract, method: "approve", params: [PREDICTION_MARKET_ADDRESS!, amtBig] }),
            { onSuccess: (result: any) => { approveTxHash = result?.transactionHash ?? "0x"; res(); }, onError: (e) => rej(e) });
        });

        if (approveTxHash && approveTxHash !== "0x") {
          await waitForReceipt({ client, chain: activeChain, transactionHash: approveTxHash });
        } else {
          await new Promise(r => setTimeout(r, 6000));
        }
      }

      // 2. Place the bet
      setBetStep("betting");
      let betTxHash: `0x${string}` = "0x";
      await new Promise<void>((res, rej) => {
        sendTx(prepareContractCall({ contract, method: "placeBet", params: [BigInt(marketId), side, amtBig] }),
          { onSuccess: (result: any) => { betTxHash = result?.transactionHash ?? "0x"; res(); }, onError: (e) => rej(e) });
      });

      if (betTxHash && betTxHash !== "0x") {
        await waitForReceipt({ client, chain: activeChain, transactionHash: betTxHash });
      }

      setBetStep("done");
      fetchMarket();
    } catch (e: any) {
      setErrMsg(e?.message?.slice(0, 120) ?? "Transaction failed.");
      setBetStep("error");
    }
  }

  function handleShare() {
    navigator.clipboard.writeText(window.location.href);
    alert("Market link copied! Send it to your friends.");
  }

  if (loading) {
    return (
      <main style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "#ffffff" }}>
        <div style={{ width: 40, height: 40, border: "3px solid rgba(16,185,129,0.2)", borderTopColor: "#10B981", borderRadius: "50%", animation: "spin 1s linear infinite" }} />
        <style>{`@keyframes spin { 100% { transform: rotate(360deg); } }`}</style>
      </main>
    );
  }

  if (!market) {
    return (
      <main style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column", gap: 16, background: "#ffffff" }}>
        <h1 style={{ color: "#111827", fontFamily: "var(--font-space-grotesk)", fontSize: 32 }}>Market Not Found</h1>
        <Link href="/markets">
          <button style={{ padding: "12px 24px", borderRadius: 12, background: "rgba(155,92,255,0.1)", color: "#7C3AED", border: "1px solid rgba(155,92,255,0.3)", cursor: "pointer", fontFamily: "monospace" }}>Go Back</button>
        </Link>
      </main>
    );
  }

  const clr = CATCLR[market.category] || "#9ca3af";
  const total = yesPool + noPool;
  const yP = total > 0 ? Math.round((yesPool / total) * 100) : 50;
  
  // Payout math
  const myPool = side === 0 ? yesPool : noPool;
  const myContrib = amount * 1e6;
  const newTotal = total * 1e6 + myContrib;
  const newMyPool = myPool * 1e6 + myContrib;
  const payout = newMyPool > 0 ? ((newTotal / newMyPool) * amount) : 0;
  const multiplier = amount > 0 ? (payout / amount).toFixed(2) : "—";
  
  const isLive = Number(market.status) === 0;

  return (
    <main style={{ minHeight: "100vh", padding: "80px 24px", maxWidth: 1100, margin: "0 auto", background: "#ffffff" }}>
      <Link href="/markets" style={{ display: "inline-flex", alignItems: "center", gap: 8, color: "#9ca3af", textDecoration: "none", fontSize: 13, fontFamily: "monospace", marginBottom: 32 }}>
        <ArrowLeft size={14} /> Back to Markets
      </Link>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 380px", gap: 40, alignItems: "start" }}>
        
        {/* Left Side: Market Info */}
        <div style={{ display: "flex", flexDirection: "column", gap: 32 }}>
          
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16 }}>
              <span style={{ fontSize: 11, fontFamily: "monospace", padding: "4px 12px", borderRadius: 99, background: `${clr}15`, border: `1px solid ${clr}30`, color: clr, textTransform: "uppercase", letterSpacing: "0.05em" }}>
                {market.category}
              </span>
              <span style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, fontFamily: "monospace", color: "#9ca3af" }}>
                <Clock size={14} /> {timeLeft}
              </span>
              <button onClick={handleShare} style={{ display: "flex", alignItems: "center", gap: 6, background: "#f9fafb", border: "1px solid #e5e7eb", padding: "4px 12px", borderRadius: 99, color: "#6b7280", fontSize: 11, fontFamily: "monospace", cursor: "pointer", marginLeft: "auto" }}>
                <Share size={12} /> Share Link
              </button>
            </div>
            <h1 style={{ fontSize: 42, fontWeight: 800, color: "#111827", margin: 0, fontFamily: "var(--font-space-grotesk)", lineHeight: 1.2, letterSpacing: "-0.02em" }}>
              {market.question}
            </h1>
          </div>

          <div style={{ padding: 32, borderRadius: 24, background: "#f9fafb", border: "1px solid #e5e7eb" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 16 }}>
              <span style={{ fontSize: 14, fontFamily: "monospace", color: "#9ca3af", textTransform: "uppercase", letterSpacing: "0.1em" }}>Live Prediction</span>
              <span style={{ fontSize: 18, fontFamily: "monospace", color: "#111827" }}>Pool: <strong style={{ color: clr }}>${total.toLocaleString("en", { maximumFractionDigits: 2 })}</strong></span>
            </div>
            
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 24, fontWeight: 800, fontFamily: "var(--font-space-grotesk)", marginBottom: 12 }}>
              <span style={{ color: "#16a34a" }}>YES {yP}%</span>
              <span style={{ color: "#f87171" }}>NO {100 - yP}%</span>
            </div>
            <div style={{ height: 12, background: "#e5e7eb", borderRadius: 99, overflow: "hidden", display: "flex" }}>
              <motion.div initial={{ width: 0 }} animate={{ width: `${yP}%` }} transition={{ duration: 1, ease: "easeOut" }} style={{ background: "linear-gradient(90deg,#16a34a,#34d399)" }} />
              <motion.div initial={{ width: 0 }} animate={{ width: `${100 - yP}%` }} transition={{ duration: 1, ease: "easeOut" }} style={{ background: "linear-gradient(90deg,#f87171,#ef4444)" }} />
            </div>
          </div>

          <div>
            <h3 style={{ fontSize: 16, fontFamily: "monospace", color: "#6b7280", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 12 }}>Market Rules</h3>
            <p style={{ fontSize: 15, color: "#4b5563", lineHeight: 1.6, margin: 0 }}>
              This prediction market settles based on the outcome of the question. If you bet on the correct side, you will win a proportional share of the entire opposing pool. Base USDC is used for all transactions. Winnings can be claimed instantly once the market resolves.
            </p>
          </div>
        </div>

        {/* Right Side: Betting Widget */}
        <div style={{ position: "sticky", top: 100, padding: 32, borderRadius: 24, background: "#f9fafb", border: "1px solid #e5e7eb", boxShadow: "0 4px 24px rgba(0,0,0,0.06)", display: "flex", flexDirection: "column", gap: 24 }}>
          
          <div style={{ display: "flex", gap: 12 }}>
            {([0, 1] as const).map(s => (
              <button key={s} onClick={() => setSide(s)} style={{
                flex: 1, padding: "16px 0", borderRadius: 16, fontSize: 16, fontWeight: 800, fontFamily: "monospace", cursor: "pointer", transition: "all 0.2s",
                background: side === s ? (s === 0 ? "rgba(22,163,74,0.12)" : "rgba(248,113,113,0.12)") : "#ffffff",
                border: side === s ? (s === 0 ? "1px solid rgba(22,163,74,0.5)" : "1px solid rgba(248,113,113,0.5)") : "1px solid #e5e7eb",
                color: side === s ? (s === 0 ? "#16a34a" : "#f87171") : "#9ca3af",
              }}>
                {s === 0 ? "Buy YES" : "Buy NO"}
              </button>
            ))}
          </div>

          <div>
            <div style={{ position: "relative", marginBottom: 12 }}>
              <span style={{ position: "absolute", left: 16, top: "50%", transform: "translateY(-50%)", fontSize: 16, color: "#9ca3af", fontFamily: "monospace", pointerEvents: "none" }}>$</span>
              <input
                type="number" min={1} value={inputStr}
                onChange={e => { setInputStr(e.target.value); setAmount(Number(e.target.value) || 0); }}
                style={{ width: "100%", padding: "16px 16px 16px 36px", borderRadius: 16, fontSize: 20, fontWeight: 800, fontFamily: "monospace", background: "#ffffff", border: "1px solid #e5e7eb", color: "#111827", outline: "none", boxSizing: "border-box" }}
              />
            </div>
            <div style={{ display: "flex", gap: 8 }}>
              {QUICK_AMOUNTS.map(v => (
                <button key={v} onClick={() => { setAmount(v); setInputStr(String(v)); }} style={{ flex: 1, padding: "8px 0", borderRadius: 10, fontSize: 12, fontFamily: "monospace", cursor: "pointer", background: amount === v ? `${clr}20` : "#f9fafb", border: amount === v ? `1px solid ${clr}50` : "1px solid #e5e7eb", color: amount === v ? clr : "#9ca3af" }}>
                  ${v}
                </button>
              ))}
            </div>
          </div>

          <div style={{ padding: 16, borderRadius: 16, background: "#ffffff", border: "1px solid #e5e7eb", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, color: "#9ca3af", fontFamily: "monospace", fontSize: 13 }}>
              <TrendingUp size={16} color={clr} /> Est. Payout
            </div>
            <div style={{ textAlign: "right" }}>
              <span style={{ fontSize: 20, fontWeight: 800, fontFamily: "monospace", color: clr }}>${payout.toFixed(2)}</span>
            </div>
          </div>

          {betStep === "error" && <div style={{ padding: 12, borderRadius: 12, background: "rgba(248,113,113,0.1)", border: "1px solid rgba(248,113,113,0.3)", color: "#f87171", fontSize: 13, fontFamily: "monospace" }}>{errMsg}</div>}
          {betStep === "done" && <div style={{ padding: 12, borderRadius: 12, background: "rgba(22,163,74,0.1)", border: "1px solid rgba(22,163,74,0.3)", color: "#16a34a", fontSize: 13, fontFamily: "monospace", display: "flex", alignItems: "center", gap: 8 }}><CheckCircle2 size={16} /> Bet Placed Successfully!</div>}

          <button onClick={handleBet} disabled={!isLive || !account || betStep === "approving" || betStep === "betting"} style={{
            padding: 20, borderRadius: 16, fontSize: 16, fontWeight: 800, color: "#000", border: "none", cursor: (!isLive || !account) ? "not-allowed" : "pointer",
            background: (!isLive || !account) ? "#e5e7eb" : (side === 0 ? "#16a34a" : "#f87171"),
            display: "flex", alignItems: "center", justifyContent: "center", gap: 10, transition: "all 0.2s"
          }}>
            {!isLive ? "Market Ended" : !account ? "Connect Wallet" : betStep === "approving" ? "Approving..." : betStep === "betting" ? "Placing Bet..." : `Place Bet`}
          </button>

        </div>
      </div>
      
      {/* Mobile styling overrides: CSS could handle grid turning to 1fr on mobile, for now it's simple grid */}
      <style>{`
        @media (max-width: 900px) {
          main > div { grid-template-columns: 1fr !important; }
        }
      `}</style>
    </main>
  );
}
