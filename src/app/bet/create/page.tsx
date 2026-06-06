"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useActiveAccount, useReadContract, useSendTransaction } from "thirdweb/react";
import { prepareContractCall } from "thirdweb";
import { getFriendBetContract, getUSDCContract, FRIEND_BET_ADDRESS } from "@/lib/contracts";
import { parseUSDC, getBetShareUrl } from "@/lib/utils";
import toast from "react-hot-toast";
import { Users, DollarSign, Shield, Clock, Copy, AlertCircle } from "lucide-react";

export default function CreateBetPage() {
  const router = useRouter();
  const account = useActiveAccount();

  const [condition, setCondition] = useState("");
  const [amount, setAmount] = useState(5);
  const [judge, setJudge] = useState("");
  const [deadlineDate, setDeadlineDate] = useState("");
  const [deadlineTime, setDeadlineTime] = useState("23:59");
  const [approving, setApproving] = useState(false);
  const [creating, setCreating] = useState(false);
  const [createdBetId, setCreatedBetId] = useState<bigint | null>(null);

  const friendBetContract = getFriendBetContract();
  const usdcContract = getUSDCContract();

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

  const usdcAmount = parseUSDC(amount);
  const needsApproval = !allowance || allowance < usdcAmount;

  // Compute deadline Unix timestamp
  function getDeadlineTimestamp(): number {
    if (!deadlineDate) return 0;
    const dt = new Date(`${deadlineDate}T${deadlineTime || "23:59"}:00`);
    return Math.floor(dt.getTime() / 1000);
  }

  async function handleApprove() {
    if (!account) { toast.error("Connect your wallet first"); return; }
    if (!FRIEND_BET_ADDRESS) { toast.error("Contract not deployed yet"); return; }
    setApproving(true);
    const tx = prepareContractCall({
      contract: usdcContract,
      method: "approve",
      params: [FRIEND_BET_ADDRESS, usdcAmount],
    });
    sendTx(tx, {
      onSuccess: () => {
        toast.success(`$${amount} USDC approved!`);
        refetchAllowance();
        setApproving(false);
      },
      onError: (err) => {
        toast.error(err.message || "Approval failed");
        setApproving(false);
      },
    });
  }

  async function handleCreate() {
    if (!account) { toast.error("Connect your wallet first"); return; }
    if (!condition.trim()) { toast.error("Write your bet condition"); return; }
    if (!judge || !/^0x[a-fA-F0-9]{40}$/.test(judge)) {
      toast.error("Enter a valid judge wallet address");
      return;
    }
    if (judge.toLowerCase() === account.address.toLowerCase()) {
      toast.error("You can't be your own judge");
      return;
    }
    const deadline = getDeadlineTimestamp();
    if (!deadline || deadline <= Date.now() / 1000) {
      toast.error("Pick a deadline in the future");
      return;
    }
    if (!friendBetContract) { toast.error("Contract not deployed yet"); return; }

    setCreating(true);
    const tx = prepareContractCall({
      contract: friendBetContract,
      method: "createBet",
      params: [condition, usdcAmount, judge as `0x${string}`, BigInt(deadline)],
    });
    sendTx(tx, {
      onSuccess: async (receipt) => {
        // Parse betId from logs — betCounter increments so we read it
        toast.success("Bet created! 🎉");
        setCreating(false);
        // Navigate to dashboard to see the bet
        router.push("/dashboard");
      },
      onError: (err) => {
        toast.error(err.message || "Transaction failed");
        setCreating(false);
      },
    });
  }

  const formValid =
    condition.trim().length > 0 &&
    amount >= 1 &&
    amount <= 100 &&
    /^0x[a-fA-F0-9]{40}$/.test(judge) &&
    judge.toLowerCase() !== (account?.address ?? "").toLowerCase() &&
    getDeadlineTimestamp() > Date.now() / 1000;

  if (!FRIEND_BET_ADDRESS) {
    return (
      <div className="page">
        <div className="container" style={{ maxWidth: "600px", textAlign: "center", paddingTop: "4rem" }}>
          <AlertCircle size={48} color="var(--warning)" style={{ margin: "0 auto 1rem" }} />
          <h1 style={{ marginBottom: "1rem" }}>Contract Not Deployed Yet</h1>
          <p style={{ color: "var(--text-secondary)" }}>
            Add the FriendBet contract address to{" "}
            <code style={{ color: "var(--accent)" }}>NEXT_PUBLIC_FRIEND_BET_ADDRESS</code>.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="page">
      <div
        className="container"
        style={{
          maxWidth: "800px",
          display: "grid",
          gridTemplateColumns: "1fr",
          gap: "1.5rem",
        }}
      >
        {/* Title */}
        <div className="animate-fade-in">
          <h1 style={{ fontSize: "clamp(1.5rem, 4vw, 2rem)", marginBottom: "0.5rem" }}>
            Create a Bet
          </h1>
          <p style={{ color: "var(--text-secondary)", fontSize: "0.9rem" }}>
            Set your terms, pick a judge, and share the link. Smart contracts hold the money safely.
          </p>
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 340px), 1fr))",
            gap: "1.5rem",
            alignItems: "start",
          }}
        >
          {/* Form */}
          <div
            className="card animate-slide-up"
            style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}
          >
            {/* Condition */}
            <div className="form-group">
              <label className="label" htmlFor="condition">
                What's the bet?
              </label>
              <textarea
                id="condition"
                className="input"
                placeholder="e.g. I'll run a 5K in under 30 minutes by July 1st"
                value={condition}
                onChange={(e) => setCondition(e.target.value.slice(0, 200))}
                rows={3}
              />
              <span
                style={{
                  fontSize: "0.75rem",
                  color: condition.length > 180 ? "var(--warning)" : "var(--text-muted)",
                  textAlign: "right",
                }}
              >
                {condition.length}/200
              </span>
            </div>

            {/* Amount slider */}
            <div className="form-group">
              <label className="label" htmlFor="amount">
                Bet Amount
              </label>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "1rem",
                  padding: "1rem",
                  background: "var(--surface)",
                  borderRadius: "var(--radius-md)",
                  border: "1px solid var(--border)",
                }}
              >
                <DollarSign size={18} color="var(--success)" />
                <input
                  id="amount"
                  type="range"
                  min={1}
                  max={100}
                  value={amount}
                  onChange={(e) => setAmount(Number(e.target.value))}
                  style={{ flex: 1, accentColor: "var(--accent)" }}
                />
                <span
                  style={{
                    fontWeight: 700,
                    fontSize: "1.125rem",
                    color: "var(--success)",
                    minWidth: "60px",
                    textAlign: "right",
                  }}
                >
                  ${amount}
                </span>
              </div>
              <span style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>
                Each party deposits ${amount} USDC. Winner gets $
                {(amount * 2 * 0.97).toFixed(2)}.
              </span>
            </div>

            {/* Judge */}
            <div className="form-group">
              <label className="label" htmlFor="judge">
                Judge Wallet Address
              </label>
              <input
                id="judge"
                type="text"
                className="input"
                placeholder="0x..."
                value={judge}
                onChange={(e) => setJudge(e.target.value.trim())}
              />
              <span style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>
                This person calls the winner. Must be a neutral party — not you or your opponent.
              </span>
            </div>

            {/* Deadline */}
            <div className="form-group">
              <label className="label">Deadline</label>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.5rem" }}>
                <input
                  type="date"
                  className="input"
                  value={deadlineDate}
                  min={new Date().toISOString().split("T")[0]}
                  onChange={(e) => setDeadlineDate(e.target.value)}
                />
                <input
                  type="time"
                  className="input"
                  value={deadlineTime}
                  onChange={(e) => setDeadlineTime(e.target.value)}
                />
              </div>
            </div>

            {/* Action */}
            {!account ? (
              <p
                style={{
                  textAlign: "center",
                  color: "var(--text-muted)",
                  fontSize: "0.875rem",
                }}
              >
                Connect your wallet to create a bet
              </p>
            ) : needsApproval ? (
              <button
                className="btn btn-secondary"
                style={{ width: "100%" }}
                onClick={handleApprove}
                disabled={approving || !formValid}
              >
                {approving ? "Approving..." : `Step 1: Approve $${amount} USDC`}
              </button>
            ) : (
              <button
                className="btn btn-primary"
                style={{ width: "100%" }}
                onClick={handleCreate}
                disabled={creating || !formValid}
              >
                {creating ? "Creating..." : `Create Bet — Deposit $${amount} USDC`}
              </button>
            )}
          </div>

          {/* Preview card */}
          <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
            <h3 style={{ fontSize: "0.9rem", color: "var(--text-secondary)", fontWeight: 500 }}>
              Preview
            </h3>
            <div
              className="card"
              style={{
                borderColor: condition ? "rgba(124,58,237,0.3)" : "var(--border)",
                transition: "border-color 0.2s",
              }}
            >
              {/* Condition preview */}
              <p
                style={{
                  fontWeight: 600,
                  fontSize: "1rem",
                  lineHeight: 1.5,
                  marginBottom: "1.25rem",
                  color: condition ? "var(--text-primary)" : "var(--text-muted)",
                  fontStyle: condition ? "normal" : "italic",
                }}
              >
                {condition || "Your bet condition will appear here..."}
              </p>

              {/* Details */}
              <div style={{ display: "flex", flexDirection: "column", gap: "0.625rem" }}>
                {[
                  {
                    icon: <DollarSign size={14} />,
                    label: "Each side deposits",
                    value: `$${amount} USDC`,
                    color: "var(--success)",
                  },
                  {
                    icon: <Trophy size={14} />,
                    label: "Winner receives",
                    value: `$${(amount * 2 * 0.97).toFixed(2)} USDC`,
                    color: "var(--warning)",
                  },
                  {
                    icon: <Shield size={14} />,
                    label: "Judge",
                    value: judge
                      ? `${judge.slice(0, 6)}...${judge.slice(-4)}`
                      : "Not set",
                    color: "var(--text-secondary)",
                  },
                  {
                    icon: <Clock size={14} />,
                    label: "Deadline",
                    value: deadlineDate
                      ? `${deadlineDate} ${deadlineTime}`
                      : "Not set",
                    color: "var(--text-secondary)",
                  },
                ].map((item, i) => (
                  <div
                    key={i}
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      gap: "0.5rem",
                    }}
                  >
                    <span
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "0.375rem",
                        color: "var(--text-muted)",
                        fontSize: "0.8rem",
                      }}
                    >
                      {item.icon}
                      {item.label}
                    </span>
                    <span
                      style={{
                        fontWeight: 600,
                        fontSize: "0.875rem",
                        color: item.color,
                      }}
                    >
                      {item.value}
                    </span>
                  </div>
                ))}
              </div>

              <div className="divider" style={{ margin: "1rem 0" }} />

              <div
                style={{
                  background: "var(--surface)",
                  borderRadius: "var(--radius-md)",
                  padding: "0.75rem",
                  fontSize: "0.8rem",
                  color: "var(--text-muted)",
                  display: "flex",
                  gap: "0.5rem",
                  alignItems: "flex-start",
                }}
              >
                <Shield size={14} style={{ flexShrink: 0, marginTop: "1px" }} />
                <span>
                  Funds are locked in a smart contract until the judge calls the winner. 3%
                  platform fee applies.
                </span>
              </div>
            </div>

            {/* Trust badges */}
            {[
              { icon: <Users size={14} />, text: "Share link after creation" },
              { icon: <Shield size={14} />, text: "Funds locked on-chain" },
              { icon: <Clock size={14} />, text: "Auto-paid on resolution" },
            ].map((item, i) => (
              <div
                key={i}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "0.5rem",
                  color: "var(--text-muted)",
                  fontSize: "0.8rem",
                }}
              >
                {item.icon}
                {item.text}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// Silence TS for unused import
function Trophy({ size }: { size: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6" />
      <path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18" />
      <path d="M4 22h16" />
      <path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22" />
      <path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22" />
      <path d="M18 2H6v7a6 6 0 0 0 12 0V2Z" />
    </svg>
  );
}
