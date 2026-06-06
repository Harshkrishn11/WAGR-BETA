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
      <div className="page">
        <div className="container" style={{ maxWidth: "500px", textAlign: "center", paddingTop: "4rem" }}>
          <AlertCircle size={48} color="var(--warning)" style={{ margin: "0 auto 1rem" }} />
          <h1>Contract not deployed</h1>
        </div>
      </div>
    );
  }

  if (!bet || bet.id === BigInt(0)) {
    return (
      <div className="page">
        <div className="container" style={{ maxWidth: "500px" }}>
          <div className="card" style={{ textAlign: "center", padding: "3rem" }}>
            <div className="skeleton" style={{ height: "24px", marginBottom: "1rem" }} />
            <div className="skeleton" style={{ height: "16px", marginBottom: "0.5rem" }} />
            <div className="skeleton" style={{ height: "16px" }} />
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
    <div className="page">
      <div className="container" style={{ maxWidth: "580px" }}>
        {/* Header */}
        <div style={{ marginBottom: "1.5rem" }} className="animate-fade-in">
          <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", marginBottom: "0.5rem" }}>
            <h1 style={{ fontSize: "1.5rem" }}>Bet #{id}</h1>
            <span className={`badge ${statusConfig.className}`}>{statusConfig.label}</span>
          </div>
          <p style={{ color: "var(--text-secondary)", fontSize: "0.875rem" }}>
            Created by {shortenAddress(bet.creator)}
          </p>
        </div>

        {/* Bet card */}
        <div className="card animate-slide-up" style={{ marginBottom: "1.5rem" }}>
          {/* Condition */}
          <div
            style={{
              background: "var(--surface)",
              borderRadius: "var(--radius-md)",
              padding: "1.25rem",
              marginBottom: "1.5rem",
              borderLeft: "3px solid var(--accent)",
            }}
          >
            <p style={{ fontWeight: 600, fontSize: "1.05rem", lineHeight: 1.5 }}>
              &ldquo;{bet.condition}&rdquo;
            </p>
          </div>

          {/* Details grid */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
            {[
              {
                icon: <DollarSign size={16} color="var(--success)" />,
                label: "Each side",
                value: formatUSDC(bet.amount),
                bold: true,
                color: "var(--success)",
              },
              {
                icon: <DollarSign size={16} color="var(--warning)" />,
                label: "Winner gets",
                value: formatUSDC((bet.amount * BigInt(2) * BigInt(97)) / BigInt(100)),
                bold: true,
                color: "var(--warning)",
              },
              {
                icon: <Shield size={16} color="var(--text-secondary)" />,
                label: "Judge",
                value: shortenAddress(bet.judge),
                bold: false,
                color: "var(--text-primary)",
              },
              {
                icon: <Clock size={16} color="var(--text-secondary)" />,
                label: "Deadline",
                value: formatDate(Number(bet.deadline)),
                bold: false,
                color: deadlinePassed ? "var(--error)" : "var(--text-primary)",
              },
            ].map((item, i) => (
              <div
                key={i}
                style={{
                  background: "var(--surface)",
                  borderRadius: "var(--radius-md)",
                  padding: "0.875rem",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "0.375rem",
                    color: "var(--text-muted)",
                    fontSize: "0.75rem",
                    marginBottom: "0.375rem",
                  }}
                >
                  {item.icon}
                  {item.label}
                </div>
                <div style={{ fontWeight: item.bold ? 700 : 500, color: item.color }}>
                  {item.value}
                </div>
              </div>
            ))}
          </div>

          {/* Participants */}
          {bet.status !== BetStatus.Open && (
            <div style={{ marginTop: "1rem" }}>
              <div className="divider" />
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr",
                  gap: "0.75rem",
                  marginTop: "1rem",
                }}
              >
                <div
                  style={{
                    background: "rgba(124,58,237,0.08)",
                    borderRadius: "var(--radius-md)",
                    padding: "0.75rem",
                    border: "1px solid rgba(124,58,237,0.2)",
                  }}
                >
                  <div style={{ fontSize: "0.75rem", color: "var(--text-muted)", marginBottom: "0.25rem" }}>
                    Creator
                  </div>
                  <div style={{ fontWeight: 600, fontSize: "0.875rem" }}>
                    {shortenAddress(bet.creator)}
                    {bet.winner === bet.creator && (
                      <CheckCircle size={14} color="var(--success)" style={{ display: "inline", marginLeft: "0.375rem" }} />
                    )}
                  </div>
                </div>
                {bet.opponent && bet.opponent !== "0x0000000000000000000000000000000000000000" && (
                  <div
                    style={{
                      background: "rgba(168,85,247,0.08)",
                      borderRadius: "var(--radius-md)",
                      padding: "0.75rem",
                      border: "1px solid rgba(168,85,247,0.2)",
                    }}
                  >
                    <div style={{ fontSize: "0.75rem", color: "var(--text-muted)", marginBottom: "0.25rem" }}>
                      Opponent
                    </div>
                    <div style={{ fontWeight: 600, fontSize: "0.875rem" }}>
                      {shortenAddress(bet.opponent)}
                      {bet.winner === bet.opponent && (
                        <CheckCircle size={14} color="var(--success)" style={{ display: "inline", marginLeft: "0.375rem" }} />
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
          <div className="card animate-fade-in" style={{ padding: "1.5rem" }}>
            {canAccept ? (
              <>
                <h3 style={{ marginBottom: "0.5rem", fontSize: "1rem" }}>
                  Accept this bet
                </h3>
                <p style={{ color: "var(--text-secondary)", fontSize: "0.875rem", marginBottom: "1.25rem" }}>
                  You'll deposit {formatUSDC(bet.amount)} USDC. If you win, you get{" "}
                  {formatUSDC((bet.amount * BigInt(2) * BigInt(97)) / BigInt(100))}.
                </p>
                {needsApproval ? (
                  <button
                    className="btn btn-secondary"
                    style={{ width: "100%" }}
                    onClick={handleApprove}
                    disabled={approving}
                  >
                    {approving ? "Approving..." : `Step 1: Approve ${formatUSDC(bet.amount)} USDC`}
                  </button>
                ) : (
                  <button
                    className="btn btn-primary"
                    style={{ width: "100%" }}
                    onClick={handleAccept}
                    disabled={accepting}
                  >
                    {accepting ? "Locking funds..." : `Accept & Lock ${formatUSDC(bet.amount)}`}
                  </button>
                )}
              </>
            ) : isCreator ? (
              <div style={{ textAlign: "center" }}>
                <p style={{ color: "var(--text-secondary)", marginBottom: "1rem", fontSize: "0.9rem" }}>
                  Waiting for someone to accept your bet. Share this link:
                </p>
                <div
                  style={{
                    display: "flex",
                    gap: "0.5rem",
                    background: "var(--surface)",
                    borderRadius: "var(--radius-md)",
                    padding: "0.75rem",
                    border: "1px solid var(--border)",
                  }}
                >
                  <code
                    style={{
                      flex: 1,
                      fontSize: "0.8rem",
                      color: "var(--text-secondary)",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {typeof window !== "undefined" ? window.location.href : ""}
                  </code>
                  <button className="btn btn-ghost btn-sm" onClick={copyLink}>
                    <Copy size={14} />
                  </button>
                </div>
              </div>
            ) : !account ? (
              <p style={{ textAlign: "center", color: "var(--text-muted)", fontSize: "0.875rem" }}>
                Connect your wallet to accept this bet
              </p>
            ) : isJudge ? (
              <p style={{ textAlign: "center", color: "var(--text-muted)", fontSize: "0.875rem" }}>
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
            style={{ textAlign: "center", padding: "2rem", borderColor: "rgba(34,197,94,0.3)" }}
          >
            <CheckCircle size={40} color="var(--success)" style={{ margin: "0 auto 1rem" }} />
            <h3 style={{ marginBottom: "0.5rem" }}>Bet Resolved!</h3>
            <p style={{ color: "var(--text-secondary)", fontSize: "0.9rem" }}>
              Winner: <strong style={{ color: "var(--success)" }}>{shortenAddress(bet.winner)}</strong>
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
    <div className="card animate-fade-in" style={{ padding: "1.5rem", borderColor: "rgba(245,158,11,0.3)" }}>
      <h3 style={{ marginBottom: "0.5rem", color: "var(--warning)" }}>You are the Judge</h3>
      <p style={{ color: "var(--text-secondary)", fontSize: "0.875rem", marginBottom: "1.25rem" }}>
        Call the winner. This is final — the payout happens immediately.
      </p>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem" }}>
        <button
          className="btn btn-secondary"
          onClick={() => resolve(bet.creator)}
          disabled={resolving}
        >
          Creator Wins
          <br />
          <small style={{ fontWeight: 400, color: "var(--text-muted)" }}>
            {shortenAddress(bet.creator)}
          </small>
        </button>
        <button
          className="btn btn-secondary"
          onClick={() => resolve(bet.opponent)}
          disabled={resolving}
        >
          Opponent Wins
          <br />
          <small style={{ fontWeight: 400, color: "var(--text-muted)" }}>
            {shortenAddress(bet.opponent)}
          </small>
        </button>
      </div>
    </div>
  );
}
