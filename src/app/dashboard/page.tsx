"use client";

import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useActiveAccount, useReadContract, useSendTransaction } from "thirdweb/react";
import { getContract, readContract, prepareContractCall, waitForReceipt } from "thirdweb";
import { client } from "@/lib/thirdweb";
import { activeChain, PREDICTION_MARKET_ADDRESS, FRIEND_BET_ADDRESS, getFriendBetContract } from "@/lib/contracts";
import PREDICTION_MARKET_ABI from "@/lib/WagrPredictionMarket.json";
import { Activity, Gift, Clock, AlertTriangle, ArrowRightCircle, Users, CheckCircle, XCircle } from "lucide-react";
import Link from "next/link";
import toast from "react-hot-toast";
import { formatUSDC, shortenAddress } from "@/lib/utils";

interface UserBet {
  marketId: number;
  question: string;
  category: string;
  status: number; // 0=Active, 1=Dispute, 2=Claimable, 3=Invalidated
  correctOptionIndex: number;
  deadline: number;
  betOnYes: bigint;
  betOnNo: bigint;
  hasClaimed: boolean;
  hasRefunded: boolean;
  isCreator: boolean;
}

interface FriendBetRecord {
  id: bigint;
  creator: string;
  opponent: string;
  judge: string;
  amount: bigint;
  condition: string;
  deadline: bigint;
  status: number; // 0=Open, 1=Active, 2=Resolved, 3=Cancelled
  winner: string;
}

const CATCLR: Record<string, string> = { Crypto: "#9B5CFF", Politics: "#f59e0b", Sports: "#0891B2", Tech: "#059669", Macro: "#DB2777", Entertainment: "#fb923c", Science: "#34d399", Others: "#9ca3af" };

export default function DashboardPage() {
  const account = useActiveAccount();
  const { mutate: sendTx } = useSendTransaction();
  
  const contract = getContract({ client, chain: activeChain, address: PREDICTION_MARKET_ADDRESS!, abi: PREDICTION_MARKET_ABI as any });
  const { data: countData } = useReadContract({ contract, method: "nextMarketId", params: [] } as any);
  const totalMarkets = Number(countData ?? 0n);

  const [dashboardMode, setDashboardMode] = useState<"markets" | "friends">("markets");
  
  // Market State
  const [loadingMarkets, setLoadingMarkets] = useState(false);
  const [bets, setBets] = useState<UserBet[]>([]);
  const [claimLoading, setClaimLoading] = useState<number | null>(null);
  const [resolveLoading, setResolveLoading] = useState<number | null>(null);
  const [activeTab, setActiveTab] = useState<"resolve" | "claimable" | "active" | "created" | "won" | "lost">("resolve");

  // Friend Bet State
  const [loadingFriends, setLoadingFriends] = useState(false);
  const [friendBets, setFriendBets] = useState<FriendBetRecord[]>([]);
  const [activeFriendTab, setActiveFriendTab] = useState<"active" | "open" | "history">("active");
  const [cancelLoading, setCancelLoading] = useState<number | null>(null);

  // Fetch Prediction Markets
  useEffect(() => {
    if (!account?.address || totalMarkets <= 0 || dashboardMode !== "markets") return;
    
    let active = true;
    async function fetchMarkets() {
      setLoadingMarkets(true);
      try {
        const localContract = getContract({ client, chain: activeChain, address: PREDICTION_MARKET_ADDRESS!, abi: PREDICTION_MARKET_ABI as any });
        const userActivity: UserBet[] = [];
        for (let i = totalMarkets - 1; i >= 0; i--) {
          const marketData = await readContract({ contract: localContract, method: "getMarket", params: [BigInt(i)] }) as any;
          const isCreator = marketData.creator.toLowerCase() === account!.address.toLowerCase();

          const [yesAmt, noAmt, claimed, refunded] = await Promise.all([
            readContract({ contract: localContract, method: "getUserWager", params: [BigInt(i), account!.address, 0] }),
            readContract({ contract: localContract, method: "getUserWager", params: [BigInt(i), account!.address, 1] }),
            readContract({ contract: localContract, method: "hasClaimed", params: [BigInt(i), account!.address] }),
            readContract({ contract: localContract, method: "hasRefunded", params: [BigInt(i), account!.address] }),
          ]);
          
          if (yesAmt > 0n || noAmt > 0n || isCreator) {
            userActivity.push({
              marketId: i,
              question: marketData.question,
              category: marketData.category,
              status: Number(marketData.status),
              correctOptionIndex: Number(marketData.correctOptionIndex),
              deadline: Number(marketData.deadline),
              betOnYes: yesAmt as bigint,
              betOnNo: noAmt as bigint,
              hasClaimed: claimed as boolean,
              hasRefunded: refunded as boolean,
              isCreator
            });
          }
        }
        if (active) setBets(userActivity);
      } catch (err) {
        console.error("Failed to load markets", err);
      } finally {
        if (active) setLoadingMarkets(false);
      }
    }
    fetchMarkets();
    return () => { active = false; };
  }, [account?.address, totalMarkets, dashboardMode]);

  // Fetch Friend Bets
  useEffect(() => {
    if (!account?.address || dashboardMode !== "friends" || !FRIEND_BET_ADDRESS) return;

    let active = true;
    async function fetchFriendBets() {
      setLoadingFriends(true);
      try {
        const fbContract = getFriendBetContract();
        if (!fbContract) return;

        const ids = await readContract({ contract: fbContract, method: "getBetsForUser", params: [account!.address] }) as readonly bigint[];
        
        const promises = ids.map(id => readContract({ contract: fbContract, method: "getBet", params: [id] }));
        const results = await Promise.all(promises);
        
        if (active) setFriendBets(results as unknown as FriendBetRecord[]);
      } catch (err) {
        console.error("Failed to load friend bets", err);
      } finally {
        if (active) setLoadingFriends(false);
      }
    }
    fetchFriendBets();
    return () => { active = false; };
  }, [account?.address, dashboardMode]);

  async function handleClaim(marketId: number, isRefund: boolean) {
    if (!account) return;
    setClaimLoading(marketId);
    try {
      const method = isRefund ? "claimRefund" : "claimWinnings";
      const tx = prepareContractCall({ contract, method, params: [BigInt(marketId)] });
      let txHash: `0x${string}` = "0x";
      await new Promise<void>((res, rej) => sendTx(tx, { onSuccess: (result: any) => { txHash = result?.transactionHash ?? "0x"; res(); }, onError: (e) => rej(e) }));
      
      // Wait for confirmation
      if (txHash && txHash !== "0x") {
        await waitForReceipt({ client, chain: activeChain, transactionHash: txHash });
      }

      setBets(prev => prev.map(b => {
        if (b.marketId === marketId) {
          return { ...b, hasClaimed: !isRefund ? true : b.hasClaimed, hasRefunded: isRefund ? true : b.hasRefunded };
        }
        return b;
      }));
      toast.success(isRefund ? "Refund Claimed!" : "Winnings Claimed!");
    } catch (err: any) {
      toast.error(err.message || "Transaction failed");
    } finally {
      setClaimLoading(null);
    }
  }

  async function handleCreatorResolve(marketId: number, correctOption: number) {
    if (!account) return;
    setResolveLoading(marketId);
    try {
      const tx = prepareContractCall({ contract, method: "creatorResolveMarket", params: [BigInt(marketId), correctOption] });
      let txHash: `0x${string}` = "0x";
      await new Promise<void>((res, rej) => sendTx(tx, { onSuccess: (result: any) => { txHash = result?.transactionHash ?? "0x"; res(); }, onError: (e) => rej(e) }));

      // Wait for confirmation
      if (txHash && txHash !== "0x") {
        await waitForReceipt({ client, chain: activeChain, transactionHash: txHash });
      }

      setBets(prev => prev.map(b => {
        if (b.marketId === marketId) return { ...b, status: 1, correctOptionIndex: correctOption };
        return b;
      }));
      toast.success("Resolved successfully!");
    } catch (err: any) {
      toast.error(err.message || "Transaction failed");
    } finally {
      setResolveLoading(null);
    }
  }

  async function handleCancelFriendBet(betId: bigint) {
    if (!account) return;
    const fbContract = getFriendBetContract();
    if (!fbContract) return;

    setCancelLoading(Number(betId));
    try {
      const tx = prepareContractCall({ contract: fbContract, method: "cancelBet", params: [betId] });
      await new Promise<void>((res, rej) => sendTx(tx, { onSuccess: () => res(), onError: (e) => rej(e) }));
      
      setFriendBets(prev => prev.map(b => {
        if (b.id === betId) return { ...b, status: 3 };
        return b;
      }));
      toast.success("Bet Cancelled!");
    } catch (err: any) {
      toast.error(err.message || "Cancellation failed");
    } finally {
      setCancelLoading(null);
    }
  }

  // Derived state (Markets)
  const needsResolution = bets.filter(b => b.isCreator && b.status === 0 && b.deadline < Math.floor(Date.now() / 1000));
  const activeMarkets = bets.filter(b => (b.status === 0 || b.status === 1) && (b.betOnYes > 0n || b.betOnNo > 0n));
  const createdMarkets = bets.filter(b => b.isCreator);
  const claimableBets = bets.filter(b => 
    (b.status === 2 && !b.hasClaimed && ((b.correctOptionIndex === 0 && b.betOnYes > 0n) || (b.correctOptionIndex === 1 && b.betOnNo > 0n))) ||
    (b.status === 3 && !b.hasRefunded && (b.betOnYes > 0n || b.betOnNo > 0n))
  );
  const wonBets = bets.filter(b => b.status === 2 && b.hasClaimed && ((b.correctOptionIndex === 0 && b.betOnYes > 0n) || (b.correctOptionIndex === 1 && b.betOnNo > 0n)));
  const lostBets = bets.filter(b => b.status === 2 && ((b.correctOptionIndex === 1 && b.betOnYes > 0n) || (b.correctOptionIndex === 0 && b.betOnNo > 0n)));
  const refundedBets = bets.filter(b => b.status === 3 && b.hasRefunded && (b.betOnYes > 0n || b.betOnNo > 0n));

  // Derived state (Friend Bets)
  const activeFriends = friendBets.filter(b => b.status === 1);
  const openFriends = friendBets.filter(b => b.status === 0);
  const historyFriends = friendBets.filter(b => b.status === 2 || b.status === 3);

  return (
    <main style={{ minHeight: "100vh", padding: "80px 24px 80px", background: "#ffffff" }}>
      <div style={{ maxWidth: 900, margin: "0 auto" }}>
        
        {/* Header */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 24, marginBottom: 40 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
            <div style={{ width: 48, height: 48, borderRadius: 16, background: "rgba(155,92,255,0.1)", border: "1px solid rgba(155,92,255,0.2)", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <Activity size={24} color="#9B5CFF" />
            </div>
            <div>
              <h1 style={{ margin: 0, fontSize: 32, fontWeight: 800, color: "#111827", fontFamily: "var(--font-space-grotesk,sans-serif)", letterSpacing: "-0.02em" }}>My Activity</h1>
              <p style={{ margin: "4px 0 0", color: "#6b7280", fontFamily: "monospace", fontSize: 13 }}>Track your predictions and friend bets.</p>
            </div>
          </div>

          {/* Mode Switcher */}
          <div style={{ display: "flex", background: "#f9fafb", borderRadius: 12, padding: 4 }}>
            <button
              onClick={() => setDashboardMode("markets")}
              style={{
                padding: "10px 20px", borderRadius: 8, fontSize: 14, fontWeight: 700, fontFamily: "monospace", cursor: "pointer", border: "none", transition: "all 0.2s",
                background: dashboardMode === "markets" ? "#ffffff" : "transparent",
                color: dashboardMode === "markets" ? "#111827" : "#9ca3af",
                boxShadow: dashboardMode === "markets" ? "0 4px 12px rgba(0,0,0,0.08)" : "none"
              }}
            >
              Public Markets
            </button>
            <button
              onClick={() => setDashboardMode("friends")}
              style={{
                padding: "10px 20px", borderRadius: 8, fontSize: 14, fontWeight: 700, fontFamily: "monospace", cursor: "pointer", border: "none", transition: "all 0.2s", display: "flex", alignItems: "center", gap: 8,
                background: dashboardMode === "friends" ? "#ffffff" : "transparent",
                color: dashboardMode === "friends" ? "#111827" : "#9ca3af",
                boxShadow: dashboardMode === "friends" ? "0 4px 12px rgba(0,0,0,0.08)" : "none"
              }}
            >
              <Users size={16} /> Friend Bets
            </button>
          </div>
        </div>

        {!account ? (
          <div style={{ textAlign: "center", padding: "60px 0", borderRadius: 24, border: "1px dashed #e5e7eb", background: "#f9fafb" }}>
            <p style={{ color: "#6b7280", fontFamily: "monospace" }}>Connect your wallet to see your bets.</p>
          </div>
        ) : dashboardMode === "markets" ? (
          /* ================================== MARKETS MODE ================================== */
          loadingMarkets ? (
            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              {[1, 2, 3].map(i => <div key={i} style={{ height: 110, borderRadius: 16, background: "#f9fafb", border: "1px solid #e5e7eb", animation: "pulse 1.5s infinite" }} />)}
            </div>
          ) : bets.length === 0 ? (
            <div style={{ textAlign: "center", padding: "80px 0", borderRadius: 24, border: "1px solid #e5e7eb", background: "#f9fafb" }}>
              <div style={{ fontSize: 40, marginBottom: 16, opacity: 0.5 }}>👻</div>
              <h3 style={{ fontSize: 18, color: "#111827", margin: "0 0 8px" }}>No Markets Yet</h3>
              <p style={{ color: "#6b7280", fontSize: 14, margin: "0 0 24px" }}>You haven't participated in any public markets.</p>
              <Link href="/markets"><button className="btn btn-secondary" style={{ background: "#ffffff", border: "1px solid #e5e7eb", color: "#111827" }}>Explore Markets</button></Link>
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 32 }}>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap", paddingBottom: 12, borderBottom: "1px solid #e5e7eb" }}>
                {[
                  { id: "resolve",   label: "⚡ Resolve", count: needsResolution.length },
                  { id: "claimable", label: "🎁 Action Required", count: claimableBets.length },
                  { id: "active",    label: "⏱️ Active", count: activeMarkets.length },
                  { id: "created",   label: "✨ Created", count: createdMarkets.length },
                  { id: "won",       label: "✅ Won & Refunded", count: wonBets.length + refundedBets.length },
                  { id: "lost",      label: "❌ Lost", count: lostBets.length },
                ].map(tab => (
                  <button key={tab.id} onClick={() => setActiveTab(tab.id as any)}
                    style={{
                      padding: "10px 16px", borderRadius: 12, fontSize: 13, fontWeight: 700, fontFamily: "monospace", whiteSpace: "nowrap", cursor: "pointer", transition: "all 0.2s", display: "flex", alignItems: "center", gap: 8,
                      background: activeTab === tab.id ? "rgba(124,58,237,0.1)" : "#f9fafb",
                      border: activeTab === tab.id ? "1px solid rgba(124,58,237,0.3)" : "1px solid #e5e7eb",
                      color: activeTab === tab.id ? "#7C3AED" : "#6b7280"
                    }}>
                    {tab.label}
                    <span style={{ padding: "2px 6px", borderRadius: 6, fontSize: 10, background: activeTab === tab.id ? "rgba(124,58,237,0.15)" : "#e5e7eb", color: activeTab === tab.id ? "#7C3AED" : "#6b7280" }}>{tab.count}</span>
                  </button>
                ))}
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: 40 }}>
                {/* RESOLVE MARKETS */}
                {activeTab === "resolve" && (
                  <section>
                    <h2 style={{ fontSize: 14, fontWeight: 700, fontFamily: "monospace", color: "#d97706", display: "flex", alignItems: "center", gap: 8, marginBottom: 16, textTransform: "uppercase" }}><AlertTriangle size={16} /> Resolve Your Markets</h2>
                    {needsResolution.length === 0 ? <p style={{ color: "#9ca3af", fontSize: 13 }}>No markets need resolving right now.</p> : (
                      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                        {needsResolution.map(b => (
                          <div key={`resolve-${b.marketId}`} className="card" style={{ borderColor: "rgba(245,158,11,0.3)", background: "#ffffff", padding: 20, borderRadius: 16, borderStyle: "solid", borderWidth: 1 }}>
                            <p style={{ margin: "0 0 16px", fontSize: 15, fontWeight: 600, color: "#111827" }}>{b.question}</p>
                            <div style={{ display: "flex", gap: 12 }}>
                              <button onClick={() => handleCreatorResolve(b.marketId, 0)} disabled={resolveLoading === b.marketId} style={{ flex: 1, padding: "14px 0", borderRadius: 12, fontSize: 14, fontWeight: 800, cursor: resolveLoading === b.marketId ? "not-allowed" : "pointer", background: "rgba(22,163,74,0.1)", border: "1px solid rgba(22,163,74,0.3)", color: "#16a34a" }}>✅ Resolve YES</button>
                              <button onClick={() => handleCreatorResolve(b.marketId, 1)} disabled={resolveLoading === b.marketId} style={{ flex: 1, padding: "14px 0", borderRadius: 12, fontSize: 14, fontWeight: 800, cursor: resolveLoading === b.marketId ? "not-allowed" : "pointer", background: "rgba(220,38,38,0.1)", border: "1px solid rgba(220,38,38,0.3)", color: "#DC2626" }}>❌ Resolve NO</button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </section>
                )}

                {/* CLAIMABLE */}
                {activeTab === "claimable" && (
                  <section>
                    <h2 style={{ fontSize: 14, fontWeight: 700, fontFamily: "monospace", color: "#16a34a", display: "flex", alignItems: "center", gap: 8, marginBottom: 16, textTransform: "uppercase" }}><Gift size={16} /> Action Required (Claimable)</h2>
                    {claimableBets.length === 0 ? <p style={{ color: "#9ca3af", fontSize: 13 }}>No pending claims.</p> : (
                      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                        {claimableBets.map(b => (
                          <div key={b.marketId} className="card" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 16, borderColor: b.status === 2 ? "rgba(22,163,74,0.3)" : "rgba(220,38,38,0.3)", background: "#ffffff", padding: 20, borderRadius: 16, borderStyle: "solid", borderWidth: 1 }}>
                            <div>
                              <p style={{ margin: "0 0 8px", fontSize: 15, fontWeight: 600, color: "#111827" }}>{b.question}</p>
                              <p style={{ margin: 0, fontSize: 12, color: "#6b7280" }}>You bet: <strong style={{ color: "#111827" }}>${Number(b.betOnYes > 0n ? b.betOnYes : b.betOnNo) / 1e6}</strong></p>
                            </div>
                            <button onClick={() => handleClaim(b.marketId, b.status === 3)} disabled={claimLoading === b.marketId} className="btn btn-primary" style={{ background: b.status === 2 ? "#16a34a" : "#DC2626", color: "#fff", border: "none", padding: "10px 20px", borderRadius: 8, fontWeight: 600, cursor: "pointer" }}>{b.status === 3 ? "Claim Refund" : "Claim Winnings"}</button>
                          </div>
                        ))}
                      </div>
                    )}
                  </section>
                )}

                {/* ACTIVE */}
                {activeTab === "active" && (
                  <section>
                    {activeMarkets.length === 0 ? <p style={{ color: "#9ca3af", fontSize: 13 }}>No active bets right now.</p> : (
                      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                        {activeMarkets.map(b => (
                          <Link key={b.marketId} href={`/markets/${b.marketId}`} style={{ textDecoration: "none" }}>
                            <div className="card" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", background: "#ffffff", padding: 20, borderRadius: 16, border: "1px solid #e5e7eb" }}>
                              <p style={{ margin: 0, fontSize: 15, fontWeight: 600, color: "#111827" }}>{b.question}</p>
                              <div style={{ textAlign: "right" }}>
                                <span style={{ fontSize: 15, fontWeight: 800, color: b.betOnYes > 0n ? "#16a34a" : "#DC2626" }}>${Number(b.betOnYes > 0n ? b.betOnYes : b.betOnNo) / 1e6} {b.betOnYes > 0n ? "YES" : "NO"}</span>
                              </div>
                            </div>
                          </Link>
                        ))}
                      </div>
                    )}
                  </section>
                )}

                {/* CREATED */}
                {activeTab === "created" && (
                  <section>
                    {createdMarkets.length === 0 ? <p style={{ color: "#9ca3af", fontSize: 13 }}>You haven't created any markets yet.</p> : (
                      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                        {createdMarkets.map(b => (
                          <Link key={`created-${b.marketId}`} href={`/markets/${b.marketId}`} style={{ textDecoration: "none" }}>
                            <div className="card" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", background: "#ffffff", padding: 20, borderRadius: 16, border: "1px solid #e5e7eb" }}>
                              <p style={{ margin: 0, fontSize: 15, fontWeight: 600, color: "#111827" }}>{b.question}</p>
                              <span style={{ fontSize: 12, fontWeight: 700, color: b.status === 0 ? "#0891B2" : b.status === 1 ? "#d97706" : "#9ca3af" }}>{b.status === 0 ? "LIVE" : b.status === 1 ? "DISPUTE" : "CLOSED"}</span>
                            </div>
                          </Link>
                        ))}
                      </div>
                    )}
                  </section>
                )}
                
                {/* WON & LOST */}
                {(activeTab === "won" || activeTab === "lost") && (
                  <section>
                    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                      {(activeTab === "won" ? [...wonBets, ...refundedBets] : lostBets).map(b => (
                        <div key={`hist-${b.marketId}`} className="card" style={{ opacity: activeTab === "lost" ? 0.6 : 1, background: "#ffffff", padding: 20, borderRadius: 16, border: "1px solid #e5e7eb" }}>
                          <p style={{ margin: 0, fontSize: 14, fontWeight: 600, color: "#111827" }}>{b.question}</p>
                        </div>
                      ))}
                    </div>
                  </section>
                )}
              </div>
            </div>
          )
        ) : (
          /* ================================== FRIEND BETS MODE ================================== */
          loadingFriends ? (
            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              {[1, 2].map(i => <div key={i} style={{ height: 110, borderRadius: 16, background: "#f9fafb", border: "1px solid #e5e7eb", animation: "pulse 1.5s infinite" }} />)}
            </div>
          ) : friendBets.length === 0 ? (
            <div style={{ textAlign: "center", padding: "80px 0", borderRadius: 24, border: "1px solid #e5e7eb", background: "#f9fafb" }}>
              <div style={{ fontSize: 40, marginBottom: 16, opacity: 0.5 }}>🤝</div>
              <h3 style={{ fontSize: 18, color: "#111827", margin: "0 0 8px" }}>No Friend Bets Yet</h3>
              <p style={{ color: "#6b7280", fontSize: 14, margin: "0 0 24px" }}>Challenge a friend to a custom bet.</p>
              <Link href="/bet/create"><button className="btn btn-secondary" style={{ background: "#ffffff", border: "1px solid #e5e7eb", color: "#111827", padding: "10px 20px", borderRadius: 8, cursor: "pointer", fontWeight: 600 }}>Create Friend Bet</button></Link>
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 32 }}>
              <div style={{ display: "flex", gap: 8, overflowX: "auto", paddingBottom: 8, borderBottom: "1px solid #e5e7eb", scrollbarWidth: "none" }}>
                {[
                  { id: "active",  label: "⚔️ Active", count: activeFriends.length },
                  { id: "open",    label: "⏳ Open (Waiting)", count: openFriends.length },
                  { id: "history", label: "📚 History", count: historyFriends.length },
                ].map(tab => (
                  <button key={tab.id} onClick={() => setActiveFriendTab(tab.id as any)}
                    style={{
                      padding: "10px 16px", borderRadius: 12, fontSize: 13, fontWeight: 700, fontFamily: "monospace", whiteSpace: "nowrap", cursor: "pointer", transition: "all 0.2s", display: "flex", alignItems: "center", gap: 8,
                      background: activeFriendTab === tab.id ? "rgba(124,58,237,0.1)" : "#f9fafb",
                      border: activeFriendTab === tab.id ? "1px solid rgba(124,58,237,0.3)" : "1px solid #e5e7eb",
                      color: activeFriendTab === tab.id ? "#7C3AED" : "#6b7280"
                    }}>
                    {tab.label}
                    <span style={{ padding: "2px 6px", borderRadius: 6, fontSize: 10, background: activeFriendTab === tab.id ? "rgba(124,58,237,0.15)" : "#e5e7eb", color: activeFriendTab === tab.id ? "#7C3AED" : "#6b7280" }}>{tab.count}</span>
                  </button>
                ))}
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                {(activeFriendTab === "active" ? activeFriends : activeFriendTab === "open" ? openFriends : historyFriends).map(b => {
                  const isCreator = b.creator.toLowerCase() === account!.address.toLowerCase();
                  return (
                    <div key={b.id.toString()} className="card" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 16, background: "#ffffff", padding: 20, borderRadius: 16, border: "1px solid #e5e7eb" }}>
                      <div style={{ flex: 1, minWidth: 200 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
                          <span style={{ fontSize: 10, fontFamily: "monospace", padding: "2px 8px", borderRadius: 99, background: "rgba(124,58,237,0.1)", color: "#7C3AED", border: "1px solid rgba(124,58,237,0.2)", fontWeight: 700 }}>BET #{b.id.toString()}</span>
                          {b.status === 0 && <span style={{ fontSize: 10, fontFamily: "monospace", color: "#d97706", fontWeight: 700 }}>WAITING FOR OPPONENT</span>}
                          {b.status === 1 && <span style={{ fontSize: 10, fontFamily: "monospace", color: "#0891B2", fontWeight: 700 }}>ACTIVE</span>}
                          {b.status === 2 && <span style={{ fontSize: 10, fontFamily: "monospace", color: "#16a34a", fontWeight: 700 }}>RESOLVED</span>}
                          {b.status === 3 && <span style={{ fontSize: 10, fontFamily: "monospace", color: "#DC2626", fontWeight: 700 }}>CANCELLED</span>}
                        </div>
                        <p style={{ margin: "0 0 8px", fontSize: 16, fontWeight: 600, color: "#111827" }}>{b.condition}</p>
                        <p style={{ margin: 0, fontSize: 12, color: "#6b7280" }}>Stake: <strong style={{ color: "#111827" }}>{formatUSDC(b.amount)} USDC</strong> per side</p>
                      </div>
                      <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
                        {b.status === 0 && isCreator && (
                          <button onClick={() => handleCancelFriendBet(b.id)} disabled={cancelLoading === Number(b.id)} className="btn btn-secondary" style={{ color: "#DC2626", background: "#ffffff", border: "1px solid rgba(220,38,38,0.3)", padding: "10px 20px", borderRadius: 8, cursor: "pointer", fontWeight: 600 }}>
                            {cancelLoading === Number(b.id) ? "Cancelling..." : "Cancel Bet"}
                          </button>
                        )}
                        <Link href={`/bet/${b.id}`}>
                          <button className="btn btn-primary" style={{ padding: "10px 20px", fontSize: 13, background: "#111827", color: "#ffffff", border: "none", borderRadius: 8, cursor: "pointer", fontWeight: 600 }}>View Bet</button>
                        </Link>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )
        )}
      </div>
    </main>
  );
}
