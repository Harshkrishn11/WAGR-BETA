"use client";

import { useState, useEffect } from "react";
import { useActiveAccount, useSendTransaction, useReadContract } from "thirdweb/react";
import { prepareContractCall, readContract, sendAndConfirmTransaction } from "thirdweb";
import { getPredictionMarketContract, getUSDCContract, PREDICTION_MARKET_ADDRESS } from "@/lib/contracts";
import { formatUSDC } from "@/lib/utils";
import toast from "react-hot-toast";

const BET_AMOUNTS = [1, 10, 30, 50, 100, 150, 200, 300, 500];

export default function GamePage() {
  const account = useActiveAccount();
  const marketContract = getPredictionMarketContract();

  const [markets, setMarkets] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Active modal state
  const [betModalOpen, setBetModalOpen] = useState(false);
  const [selectedMarket, setSelectedMarket] = useState<any>(null);
  const [selectedOption, setSelectedOption] = useState<number>(0); // 0 = Yes, 1 = No
  const [betAmount, setBetAmount] = useState<number>(10);
  const [placing, setPlacing] = useState(false);

  // 1. Fetch total number of markets
  const { data: nextMarketId } = useReadContract({
    contract: marketContract!,
    method: "nextMarketId",
    params: [],
    queryOptions: { enabled: !!marketContract },
  });

  // 2. Fetch all markets data
  useEffect(() => {
    async function fetchMarkets() {
      if (!marketContract || nextMarketId === undefined) return;
      
      const count = Number(nextMarketId);
      if (count === 0) {
        setMarkets([]);
        setLoading(false);
        return;
      }

      try {
        const fetched = [];
        // Fetch from newest to oldest
        for (let i = count - 1; i >= 0; i--) {
          const m = await readContract({
            contract: marketContract,
            method: "getMarket",
            params: [BigInt(i)],
          });
          fetched.push({ ...(m as any), id: BigInt(i) });
        }
        setMarkets(fetched);
      } catch (err) {
        console.error("Error fetching markets", err);
      } finally {
        setLoading(false);
      }
    }

    fetchMarkets();
  }, [marketContract, nextMarketId]);

  function handleOpenBetModal(market: any, optionIndex: number) {
    if (!account) {
      toast.error("Please connect wallet first");
      return;
    }
    setSelectedMarket(market);
    setSelectedOption(optionIndex);
    setBetAmount(10); // default
    setBetModalOpen(true);
  }

  async function handlePlaceBet() {
    if (!marketContract || !selectedMarket || !account) return;
    
    setPlacing(true);
    try {
      const amountInWei = BigInt(betAmount * 1_000_000); // 6 decimals for USDC
      const usdc = getUSDCContract();
      
      // 1. Check allowance
      const allowance: bigint = await readContract({
        contract: usdc!,
        method: "allowance",
        params: [account.address, PREDICTION_MARKET_ADDRESS as `0x${string}`]
      }) as any;

      // 2. Approve if needed
      if (allowance < amountInWei) {
        toast.loading("Approving USDC...", { id: "approve" });
        const approveTx = prepareContractCall({
          contract: usdc!,
          method: "approve",
          params: [PREDICTION_MARKET_ADDRESS as `0x${string}`, amountInWei]
        });
        await sendAndConfirmTransaction({
          transaction: approveTx,
          account: account
        });
        toast.success("USDC Approved!", { id: "approve" });
      }

      // 3. Place bet
      toast.loading("Placing bet...", { id: "bet" });
      const betTx = prepareContractCall({
        contract: marketContract,
        method: "placeBet",
        params: [BigInt(selectedMarket.id), selectedOption, amountInWei]
      });
      await sendAndConfirmTransaction({
        transaction: betTx,
        account: account
      });
      toast.success(`Successfully placed $${betAmount} bet!`, { id: "bet" });
      setBetModalOpen(false);
    } catch (err: any) {
      toast.dismiss();
      toast.error(err.message || "Failed to place bet");
    } finally {
      setPlacing(false);
    }
  }

  if (loading) {
    return (
      <div className="page" style={{ display: "flex", justifyContent: "center", alignItems: "center", minHeight: "60vh" }}>
        <div style={{ color: "var(--accent)" }}>Loading Markets...</div>
      </div>
    );
  }

  return (
    <div className="page">
      <div className="container">
        <h1 style={{ fontSize: "2rem", marginBottom: "0.5rem" }}>Prediction Markets</h1>
        <p style={{ color: "var(--text-secondary)", marginBottom: "2rem" }}>
          Bet on real-world events. High risk = High reward. Proportional payouts.
        </p>

        {markets.length === 0 ? (
          <div className="card" style={{ textAlign: "center", padding: "3rem" }}>
            <p style={{ color: "var(--text-muted)" }}>No active markets found.</p>
          </div>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))", gap: "1.5rem" }}>
            {markets.map((m: any) => {
              const totalPool = Number(m.totalPool) / 1_000_000;
              const isClosed = m.isResolved || Number(m.deadline) * 1000 < Date.now();
              
              return (
                <div key={m.id.toString()} className="card" style={{ display: "flex", flexDirection: "column", gap: "1rem", position: "relative", opacity: isClosed ? 0.7 : 1 }}>
                  {/* Category Badge */}
                  <div style={{ fontSize: "0.7rem", textTransform: "uppercase", letterSpacing: "1px", color: "var(--accent)", fontWeight: 700 }}>
                    {m.category || "General"}
                  </div>
                  
                  {/* Question */}
                  <h3 style={{ fontSize: "1.1rem", lineHeight: 1.4 }}>{m.question}</h3>
                  
                  {/* Pool & Status */}
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.85rem", color: "var(--text-muted)" }}>
                    <span>Pool: ${totalPool.toFixed(2)}</span>
                    {m.isResolved ? (
                      <span style={{ color: "var(--success)" }}>Resolved</span>
                    ) : isClosed ? (
                      <span style={{ color: "var(--warning)" }}>Ended</span>
                    ) : (
                      <span style={{ color: "var(--success)" }}>Active</span>
                    )}
                  </div>

                  {/* Yes/No Buttons */}
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.5rem", marginTop: "auto" }}>
                    <button 
                      className="btn btn-secondary" 
                      onClick={() => handleOpenBetModal(m, 0)}
                      disabled={isClosed}
                      style={{ background: "rgba(34, 197, 94, 0.1)", borderColor: "rgba(34, 197, 94, 0.2)", color: "#4ade80" }}
                    >
                      Buy Yes
                    </button>
                    <button 
                      className="btn btn-secondary" 
                      onClick={() => handleOpenBetModal(m, 1)}
                      disabled={isClosed}
                      style={{ background: "rgba(239, 68, 68, 0.1)", borderColor: "rgba(239, 68, 68, 0.2)", color: "#f87171" }}
                    >
                      Buy No
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* ── Betting Modal ── */}
        {betModalOpen && selectedMarket && (
          <div style={{
            position: "fixed", top: 0, left: 0, width: "100%", height: "100%",
            background: "rgba(0,0,0,0.8)", backdropFilter: "blur(4px)",
            display: "flex", alignItems: "center", justifyContent: "center", zIndex: 100, padding: "1rem"
          }}>
            <div className="card animate-fade-in" style={{ width: "100%", maxWidth: "420px", display: "flex", flexDirection: "column", gap: "1.5rem" }}>
              <div>
                <h2 style={{ fontSize: "1.2rem", marginBottom: "0.5rem" }}>Place Your Bet</h2>
                <p style={{ color: "var(--text-secondary)", fontSize: "0.9rem", lineHeight: 1.4 }}>{selectedMarket.question}</p>
              </div>

              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "1rem", background: "var(--background)", borderRadius: "var(--radius-md)" }}>
                <span style={{ color: "var(--text-muted)" }}>Outcome</span>
                <strong style={{ color: selectedOption === 0 ? "#4ade80" : "#f87171", fontSize: "1.2rem" }}>
                  {selectedOption === 0 ? "YES" : "NO"}
                </strong>
              </div>

              <div>
                <label className="label" style={{ marginBottom: "0.75rem" }}>Select Amount (USDC)</label>
                <div style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem" }}>
                  {BET_AMOUNTS.map(amt => (
                    <button
                      key={amt}
                      onClick={() => setBetAmount(amt)}
                      className={`btn btn-sm ${betAmount === amt ? "btn-primary" : "btn-secondary"}`}
                      style={{ flex: "1 0 calc(33.333% - 0.5rem)" }}
                    >
                      ${amt}
                    </button>
                  ))}
                </div>
              </div>

              <div style={{ display: "flex", gap: "0.75rem" }}>
                <button className="btn btn-secondary" style={{ flex: 1 }} onClick={() => setBetModalOpen(false)}>Cancel</button>
                <button className="btn btn-primary" style={{ flex: 2 }} onClick={handlePlaceBet} disabled={placing}>
                  {placing ? "Placing..." : `Bet $${betAmount}`}
                </button>
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
