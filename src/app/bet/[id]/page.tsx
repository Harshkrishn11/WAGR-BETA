"use client";

import { use } from "react";
import { useActiveAccount, useReadContract, useSendTransaction } from "thirdweb/react";
import { prepareContractCall } from "thirdweb";
import { getFriendBetContract, getUSDCContract, FRIEND_BET_ADDRESS } from "@/lib/contracts";
import { formatUSDC, shortenAddress, formatDate, getBetStatusConfig, parseUSDC } from "@/lib/utils";
import { BetStatus } from "@/types";
import toast from "react-hot-toast";
import { useState } from "react";
import { Shield, Clock, DollarSign, Users, Copy, CheckCircle, AlertCircle } from "lucide-react";

export default function BetPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const betId = BigInt(id);
  const account = useActiveAccount();
  const [accepting, setAccepting] = useState(false);
  const [approving, setApproving] = useState(false);

  const friendBetContract = getFriendBetContract();
  const usdcContract = getUSDCContract();

  const { data: bet, refetch } = useReadContract({
    contract: friendBetContract!,
    method: "getBet",
    params: [betId],
    queryOptions: { enabled: !!friendBetContract },
  });

  const { data: allowance, refetch: refetchAllowance } = useReadContract({
    contract: usdcContract,
    method: "allowance",
    params: [
      account?.address ?? "0x0000000000000000000000000000000000000000",
      FRIEND_BET_ADDRESS ?? "0x0000000000000000000000000000000000000000",
    ],
    queryOptions: { enabled: !!account && !!FRIEND_BET_ADDRESS },
  });

  const { mutate: sendTx } = useSendTransaction();

  async function handleApprove() {
    if (!account || !bet || !FRIEND_BET_ADDRESS) return;
    setApproving(true);
    const tx = prepareContractCall({
      contract: usdcContract,
      method: "approve",
      params: [FRIEND_BET_ADDRESS, bet.amount],
    });
    sendTx(tx, {
      onSuccess: () => {
        toast.success("USDC approved!");
        refetchAllowance();
        setApproving(false);
      },
      onError: (err) => {
        toast.error(err.message || "Approval failed");
        setApproving(false);
      },
    });
  }

  async function handleAccept() {
    if (!account || !friendBetContract) return;
    setAccepting(true);
    const tx = prepareContractCall({
      contract: friendBetContract,
      method: "acceptBet",
      params: [betId],
    });
    sendTx(tx, {
      onSuccess: () => {
        toast.success("Bet accepted! Game on 🔥");
        setAccepting(false);
        refetch();
      },
      onError: (err) => {
        toast.error(err.message || "Transaction failed");
        setAccepting(false);
      },
    });
  }

  // Share this bet page URL
  function copyLink() {
    const url = typeof window !== "undefined" ? window.location.href : "";
    navigator.clipboard.writeText(url);
    toast.success("Link copied!");
  }

  if (!friendBetContract || !FRIEND_BET_ADDRESS) {
    return (
      <div className="page" style={{ background: "#ffffff", minHeight: "100vh" }}>
        <div className="container" style={{ maxWidth: "500px", textAlign: "center", paddingTop: "4rem" }}>
          <AlertCircle size={48} color="#d97706" style={{ margin: "0 auto 1rem" }} />
          <h1 style={{ color: "#111827" }}>Contract not deployed</h1>
        </div>
      </div>
    );
  }

  if (!bet || bet.id === BigInt(0)) {
    return (
      <div className="page" style={{ background: "#ffffff", minHeight: "100vh" }}>
        <div className="container" style={{ maxWidth: "500px" }}>
          <div className="card" style={{ textAlign: "center", padding: "3rem", background: "#f9fafb", border: "1px solid #e5e7eb", borderRadius: 24 }}>
            <div className="skeleton" style={{ height: "24px", marginBottom: "1rem", background: "#e5e7eb", borderRadius: 8 }} />
            <div className="skeleton" style={{ height: "16px", marginBottom: "0.5rem", background: "#e5e7eb", borderRadius: 8 }} />
            <div className="skeleton" style={{ height: "16px", background: "#e5e7eb", borderRadius: 8 }} />
          </div>
        </div>
      </div>
    );
  }

  const statusConfig = getBetStatusConfig(bet.status);
  const isCreator = account?.address?.toLowerCase() === bet.creator.toLowerCase();
  const isOpponent = account?.address?.toLowerCase() === bet.opponent?.toLowerCase();
  const isJudge = account?.address?.toLowerCase() === bet.judge.toLowerCase();
  const canAccept = bet.status === BetStatus.Open && !isCreator && !isJudge && !!account;
  const needsApproval = !allowance || allowance < bet.amount;
  const deadlinePassed = Date.now() / 1000 > Number(bet.deadline);

  return (
    <div className="page" style={{ background: "#ffffff", minHeight: "100vh", padding: "80px 24px" }}>
      <div className="container" style={{ maxWidth: "580px", margin: "0 auto" }}>
        {/* Header */}
        <div style={{ marginBottom: "1.5rem" }} className="animate-fade-in">
          <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", marginBottom: "0.5rem" }}>
            <h1 style={{ fontSize: "1.5rem", color: "#111827", fontWeight: 800, margin: 0, fontFamily: "var(--font-space-grotesk,sans-serif)" }}>Bet #{id}</h1>
            <span className={`badge ${statusConfig.className}`} style={{ padding: "4px 10px", borderRadius: 99, fontSize: 11, fontWeight: 700, fontFamily: "monospace", ...getBadgeStyle(bet.status) }}>{statusConfig.label}</span>
          </div>
          <p style={{ color: "#6b7280", fontSize: "0.875rem", margin: 0 }}>
            Created by <span style={{ fontFamily: "monospace", color: "#111827" }}>{shortenAddress(bet.creator)}</span>
          </p>
        </div>

        {/* Bet card */}
        <div className="card animate-slide-up" style={{ marginBottom: "1.5rem", background: "#ffffff", border: "1px solid #e5e7eb", padding: 24, borderRadius: 24, boxShadow: "0 4px 24px rgba(0,0,0,0.04)" }}>
          {/* Condition */}
          <div
            style={{
              background: "#f9fafb",
              borderRadius: "12px",
              padding: "1.25rem",
              marginBottom: "1.5rem",
              borderLeft: "4px solid #7C3AED",
            }}
          >
            <p style={{ fontWeight: 600, fontSize: "1.05rem", lineHeight: 1.5, color: "#111827", margin: 0 }}>
              &ldquo;{bet.condition}&rdquo;
            </p>
          </div>

          {/* Details grid */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
            {[
              {
                icon: <DollarSign size={16} color="#16a34a" />,
                label: "Each side",
                value: formatUSDC(bet.amount),
                bold: true,
                color: "#16a34a",
              },
              {
                icon: <DollarSign size={16} color="#d97706" />,
                label: "Winner gets",
                value: formatUSDC((bet.amount * BigInt(2) * BigInt(97)) / BigInt(100)),
                bold: true,
                color: "#d97706",
              },
              {
                icon: <Shield size={16} color="#9ca3af" />,
                label: "Judge",
                value: shortenAddress(bet.judge),
                bold: false,
                color: "#4b5563",
              },
              {
                icon: <Clock size={16} color="#9ca3af" />,
                label: "Deadline",
                value: formatDate(Number(bet.deadline)),
                bold: false,
                color: deadlinePassed ? "#DC2626" : "#4b5563",
              },
            ].map((item, i) => (
              <div
                key={i}
                style={{
                  background: "#f9fafb",
                  borderRadius: "12px",
                  padding: "0.875rem",
                  border: "1px solid #e5e7eb"
                }}
              >
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "0.375rem",
                    color: "#6b7280",
                    fontSize: "0.75rem",
                    marginBottom: "0.375rem",
                  }}
                >
                  {item.icon}
                  {item.label}
                </div>
                <div style={{ fontWeight: item.bold ? 700 : 500, color: item.color, fontFamily: "monospace", fontSize: 15 }}>
                  {item.value}
                </div>
              </div>
            ))}
          </div>

          {/* Participants */}
          {bet.status !== BetStatus.Open && (
            <div style={{ marginTop: "1.5rem" }}>
              <div className="divider" style={{ height: 1, background: "#e5e7eb", width: "100%", margin: "0 0 1rem" }} />
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr",
                  gap: "0.75rem",
                }}
              >
                <div
                  style={{
                    background: "rgba(124,58,237,0.05)",
                    borderRadius: "12px",
                    padding: "1rem",
                    border: "1px solid rgba(124,58,237,0.2)",
                  }}
                >
                  <div style={{ fontSize: "0.75rem", color: "#6b7280", marginBottom: "0.25rem", textTransform: "uppercase", letterSpacing: "0.05em", fontWeight: 600 }}>
                    Creator
                  </div>
                  <div style={{ fontWeight: 700, fontSize: "0.875rem", color: "#111827", fontFamily: "monospace" }}>
                    {shortenAddress(bet.creator)}
                    {bet.winner === bet.creator && (
                      <CheckCircle size={14} color="#16a34a" style={{ display: "inline", marginLeft: "0.375rem" }} />
                    )}
                  </div>
                </div>
                {bet.opponent && bet.opponent !== "0x0000000000000000000000000000000000000000" && (
                  <div
                    style={{
                      background: "rgba(8,145,178,0.05)",
                      borderRadius: "12px",
                      padding: "1rem",
                      border: "1px solid rgba(8,145,178,0.2)",
                    }}
                  >
                    <div style={{ fontSize: "0.75rem", color: "#6b7280", marginBottom: "0.25rem", textTransform: "uppercase", letterSpacing: "0.05em", fontWeight: 600 }}>
                      Opponent
                    </div>
                    <div style={{ fontWeight: 700, fontSize: "0.875rem", color: "#111827", fontFamily: "monospace" }}>
                      {shortenAddress(bet.opponent)}
                      {bet.winner === bet.opponent && (
                        <CheckCircle size={14} color="#16a34a" style={{ display: "inline", marginLeft: "0.375rem" }} />
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Action area */}
        {bet.status === BetStatus.Open && (
          <div className="card animate-fade-in" style={{ padding: "1.5rem", background: "#ffffff", border: "1px solid #e5e7eb", borderRadius: 24, boxShadow: "0 4px 24px rgba(0,0,0,0.04)" }}>
            {canAccept ? (
              <>
                <h3 style={{ marginBottom: "0.5rem", fontSize: "1.1rem", color: "#111827", fontWeight: 700 }}>
                  Accept this bet
                </h3>
                <p style={{ color: "#6b7280", fontSize: "0.875rem", marginBottom: "1.25rem", lineHeight: 1.5 }}>
                  You'll deposit <strong style={{ color: "#111827" }}>{formatUSDC(bet.amount)} USDC</strong>. If you win, you get{" "}
                  <strong style={{ color: "#16a34a" }}>{formatUSDC((bet.amount * BigInt(2) * BigInt(97)) / BigInt(100))} USDC</strong>.
                </p>
                {needsApproval ? (
                  <button
                    className="btn btn-secondary"
                    style={{ width: "100%", padding: 16, borderRadius: 12, background: "#f9fafb", color: "#4b5563", border: "1px solid #e5e7eb", fontWeight: 700, cursor: approving ? "not-allowed" : "pointer", opacity: approving ? 0.6 : 1 }}
                    onClick={handleApprove}
                    disabled={approving}
                  >
                    {approving ? "Approving..." : `Step 1: Approve ${formatUSDC(bet.amount)} USDC`}
                  </button>
                ) : (
                  <button
                    className="btn btn-primary"
                    style={{ width: "100%", padding: 16, borderRadius: 12, background: "linear-gradient(135deg,#7C3AED,#9B5CFF)", color: "#fff", border: "none", fontWeight: 700, cursor: accepting ? "not-allowed" : "pointer", opacity: accepting ? 0.6 : 1, boxShadow: "0 4px 16px rgba(124,58,237,0.3)" }}
                    onClick={handleAccept}
                    disabled={accepting}
                  >
                    {accepting ? "Locking funds..." : `Accept & Lock ${formatUSDC(bet.amount)} USDC`}
                  </button>
                )}
              </>
            ) : isCreator ? (
              <div style={{ textAlign: "center" }}>
                <p style={{ color: "#4b5563", marginBottom: "1rem", fontSize: "0.95rem", fontWeight: 500 }}>
                  Waiting for someone to accept your bet. Share this link:
                </p>
                <div
                  style={{
                    display: "flex",
                    gap: "0.5rem",
                    background: "#f9fafb",
                    borderRadius: "12px",
                    padding: "0.75rem",
                    border: "1px solid #e5e7eb",
                  }}
                >
                  <code
                    style={{
                      flex: 1,
                      fontSize: "0.85rem",
                      color: "#6b7280",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                      textAlign: "left",
                      lineHeight: "32px",
                      paddingLeft: 8
                    }}
                  >
                    {typeof window !== "undefined" ? window.location.href : ""}
                  </code>
                  <button className="btn btn-ghost btn-sm" onClick={copyLink} style={{ padding: "0 16px", background: "#e5e7eb", border: "none", borderRadius: 8, color: "#4b5563", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <Copy size={16} />
                  </button>
                </div>
              </div>
            ) : !account ? (
              <p style={{ textAlign: "center", color: "#9ca3af", fontSize: "0.875rem", margin: 0 }}>
                Connect your wallet to accept this bet
              </p>
            ) : isJudge ? (
              <p style={{ textAlign: "center", color: "#9ca3af", fontSize: "0.875rem", margin: 0 }}>
                You are the judge for this bet. You'll be able to resolve it once both parties have entered.
              </p>
            ) : null}
          </div>
        )}

        {bet.status === BetStatus.Active && isJudge && (
          <ResolveBetPanel betId={betId} bet={bet} refetch={refetch} />
        )}

        {bet.status === BetStatus.Resolved && (
          <div
            className="card animate-scale-in"
            style={{ textAlign: "center", padding: "2.5rem", border: "2px solid rgba(22,163,74,0.3)", background: "rgba(22,163,74,0.05)", borderRadius: 24 }}
          >
            <CheckCircle size={48} color="#16a34a" style={{ margin: "0 auto 1rem" }} />
            <h3 style={{ marginBottom: "0.5rem", color: "#111827", fontSize: "1.5rem", fontWeight: 800 }}>Bet Resolved!</h3>
            <p style={{ color: "#4b5563", fontSize: "1rem", margin: 0 }}>
              Winner: <strong style={{ color: "#16a34a", fontFamily: "monospace", padding: "4px 8px", background: "rgba(22,163,74,0.1)", borderRadius: 8 }}>{shortenAddress(bet.winner)}</strong>
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Resolve panel (judge only) ──
function ResolveBetPanel({
  betId,
  bet,
  refetch,
}: {
  betId: bigint;
  bet: { creator: `0x${string}`; opponent: `0x${string}`; amount: bigint };
  refetch: () => void;
}) {
  const [resolving, setResolving] = useState(false);
  const { mutate: sendTx } = useSendTransaction();
  const friendBetContract = getFriendBetContract();

  function resolve(winner: `0x${string}`) {
    if (!friendBetContract) return;
    setResolving(true);
    const tx = prepareContractCall({
      contract: friendBetContract,
      method: "resolveBet",
      params: [betId, winner],
    });
    sendTx(tx, {
      onSuccess: () => {
        toast.success("Bet resolved! Payout sent 💸");
        setResolving(false);
        refetch();
      },
      onError: (err) => {
        toast.error(err.message || "Resolution failed");
        setResolving(false);
      },
    });
  }

  return (
    <div className="card animate-fade-in" style={{ padding: "1.5rem", border: "2px solid rgba(217,119,6,0.3)", background: "rgba(217,119,6,0.05)", borderRadius: 24, marginBottom: 24 }}>
      <h3 style={{ marginBottom: "0.5rem", color: "#d97706", fontSize: "1.1rem", fontWeight: 700, display: "flex", alignItems: "center", gap: 8 }}>
        <AlertCircle size={18} /> You are the Judge
      </h3>
      <p style={{ color: "#6b7280", fontSize: "0.875rem", marginBottom: "1.25rem", lineHeight: 1.5 }}>
        Call the winner. This is final — the payout happens immediately.
      </p>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem" }}>
        <button
          className="btn btn-secondary"
          onClick={() => resolve(bet.creator)}
          disabled={resolving}
          style={{ padding: 16, borderRadius: 12, background: "#ffffff", border: "1px solid #e5e7eb", color: "#111827", fontWeight: 700, cursor: resolving ? "not-allowed" : "pointer", display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}
        >
          Creator Wins
          <small style={{ fontWeight: 600, color: "#6b7280", fontFamily: "monospace" }}>
            {shortenAddress(bet.creator)}
          </small>
        </button>
        <button
          className="btn btn-secondary"
          onClick={() => resolve(bet.opponent)}
          disabled={resolving}
          style={{ padding: 16, borderRadius: 12, background: "#ffffff", border: "1px solid #e5e7eb", color: "#111827", fontWeight: 700, cursor: resolving ? "not-allowed" : "pointer", display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}
        >
          Opponent Wins
          <small style={{ fontWeight: 600, color: "#6b7280", fontFamily: "monospace" }}>
            {shortenAddress(bet.opponent)}
          </small>
        </button>
      </div>
    </div>
  );
}

function getBadgeStyle(status: number) {
  switch (status) {
    case 0: return { background: "rgba(217,119,6,0.1)", color: "#d97706", border: "1px solid rgba(217,119,6,0.2)" };
    case 1: return { background: "rgba(8,145,178,0.1)", color: "#0891B2", border: "1px solid rgba(8,145,178,0.2)" };
    case 2: return { background: "rgba(22,163,74,0.1)", color: "#16a34a", border: "1px solid rgba(22,163,74,0.2)" };
    case 3: return { background: "rgba(220,38,38,0.1)", color: "#DC2626", border: "1px solid rgba(220,38,38,0.2)" };
    default: return {};
  }
}
