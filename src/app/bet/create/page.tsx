"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useActiveAccount, useReadContract, useSendTransaction } from "thirdweb/react";
import { prepareContractCall } from "thirdweb";
import { getFriendBetContract, getUSDCContract, FRIEND_BET_ADDRESS } from "@/lib/contracts";
import { parseUSDC, getBetShareUrl } from "@/lib/utils";
import toast from "react-hot-toast";
import { Users, DollarSign, Shield, Clock, Copy, AlertCircle, Trophy } from "lucide-react";

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
      <div className="page" style={{ background: "#ffffff", minHeight: "100vh" }}>
        <div className="container" style={{ maxWidth: "600px", textAlign: "center", paddingTop: "4rem" }}>
          <AlertCircle size={48} color="#d97706" style={{ margin: "0 auto 1rem" }} />
          <h1 style={{ marginBottom: "1rem", color: "#111827" }}>Contract Not Deployed Yet</h1>
          <p style={{ color: "#6b7280" }}>
            Add the FriendBet contract address to{" "}
            <code style={{ color: "#7C3AED", background: "#f9fafb", padding: "2px 6px", borderRadius: 4 }}>NEXT_PUBLIC_FRIEND_BET_ADDRESS</code>.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="page" style={{ background: "#ffffff", minHeight: "100vh", padding: "80px 24px" }}>
      <div
        className="container"
        style={{
          maxWidth: "800px",
          display: "grid",
          gridTemplateColumns: "1fr",
          gap: "1.5rem",
          margin: "0 auto"
        }}
      >
        {/* Title */}
        <div className="animate-fade-in" style={{ marginBottom: "1rem" }}>
          <h1 style={{ fontSize: "clamp(1.5rem, 4vw, 2.5rem)", marginBottom: "0.5rem", color: "#111827", fontWeight: 800, fontFamily: "var(--font-space-grotesk,sans-serif)" }}>
            Create a Bet
          </h1>
          <p style={{ color: "#6b7280", fontSize: "1rem" }}>
            Set your terms, pick a judge, and share the link. Smart contracts hold the money safely.
          </p>
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 340px), 1fr))",
            gap: "2rem",
            alignItems: "start",
          }}
        >
          {/* Form */}
          <div
            className="card animate-slide-up"
            style={{ display: "flex", flexDirection: "column", gap: "1.5rem", background: "#ffffff", border: "1px solid #e5e7eb", padding: 24, borderRadius: 24, boxShadow: "0 4px 24px rgba(0,0,0,0.04)" }}
          >
            {/* Condition */}
            <div className="form-group" style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              <label className="label" htmlFor="condition" style={{ fontSize: 14, fontWeight: 600, color: "#4b5563" }}>
                What's the bet?
              </label>
              <textarea
                id="condition"
                className="input"
                placeholder="e.g. I'll run a 5K in under 30 minutes by July 1st"
                value={condition}
                onChange={(e) => setCondition(e.target.value.slice(0, 200))}
                rows={3}
                style={{ width: "100%", padding: 16, borderRadius: 12, border: "1px solid #e5e7eb", background: "#f9fafb", color: "#111827", fontFamily: "inherit", resize: "none", outline: "none", transition: "border-color 0.2s" }}
                onFocus={e => e.target.style.borderColor = "#7C3AED"}
                onBlur={e => e.target.style.borderColor = "#e5e7eb"}
              />
              <span
                style={{
                  fontSize: "0.75rem",
                  color: condition.length > 180 ? "#DC2626" : "#9ca3af",
                  textAlign: "right",
                  fontFamily: "monospace"
                }}
              >
                {condition.length}/200
              </span>
            </div>

            {/* Amount slider */}
            <div className="form-group" style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              <label className="label" htmlFor="amount" style={{ fontSize: 14, fontWeight: 600, color: "#4b5563" }}>
                Bet Amount
              </label>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "1rem",
                  padding: "1rem",
                  background: "#f9fafb",
                  borderRadius: "12px",
                  border: "1px solid #e5e7eb",
                }}
              >
                <DollarSign size={18} color="#16a34a" />
                <input
                  id="amount"
                  type="range"
                  min={1}
                  max={100}
                  value={amount}
                  onChange={(e) => setAmount(Number(e.target.value))}
                  style={{ flex: 1, accentColor: "#7C3AED" }}
                />
                <span
                  style={{
                    fontWeight: 700,
                    fontSize: "1.125rem",
                    color: "#16a34a",
                    minWidth: "60px",
                    textAlign: "right",
                  }}
                >
                  ${amount}
                </span>
              </div>
              <span style={{ fontSize: "0.75rem", color: "#6b7280" }}>
                Each party deposits ${amount} USDC. Winner gets $
                {(amount * 2 * 0.97).toFixed(2)}.
              </span>
            </div>

            {/* Judge */}
            <div className="form-group" style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              <label className="label" htmlFor="judge" style={{ fontSize: 14, fontWeight: 600, color: "#4b5563" }}>
                Judge Wallet Address
              </label>
              <input
                id="judge"
                type="text"
                className="input"
                placeholder="0x..."
                value={judge}
                onChange={(e) => setJudge(e.target.value.trim())}
                style={{ width: "100%", padding: 16, borderRadius: 12, border: "1px solid #e5e7eb", background: "#f9fafb", color: "#111827", fontFamily: "monospace", outline: "none", transition: "border-color 0.2s" }}
                onFocus={e => e.target.style.borderColor = "#7C3AED"}
                onBlur={e => e.target.style.borderColor = "#e5e7eb"}
              />
              <span style={{ fontSize: "0.75rem", color: "#6b7280" }}>
                This person calls the winner. Must be a neutral party — not you or your opponent.
              </span>
            </div>

            {/* Deadline */}
            <div className="form-group" style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              <label className="label" style={{ fontSize: 14, fontWeight: 600, color: "#4b5563" }}>Deadline</label>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.5rem" }}>
                <input
                  type="date"
                  className="input"
                  value={deadlineDate}
                  min={new Date().toISOString().split("T")[0]}
                  onChange={(e) => setDeadlineDate(e.target.value)}
                  style={{ width: "100%", padding: 12, borderRadius: 12, border: "1px solid #e5e7eb", background: "#f9fafb", color: "#111827", fontFamily: "inherit", outline: "none" }}
                />
                <input
                  type="time"
                  className="input"
                  value={deadlineTime}
                  onChange={(e) => setDeadlineTime(e.target.value)}
                  style={{ width: "100%", padding: 12, borderRadius: 12, border: "1px solid #e5e7eb", background: "#f9fafb", color: "#111827", fontFamily: "inherit", outline: "none" }}
                />
              </div>
            </div>

            {/* Action */}
            {!account ? (
              <p
                style={{
                  textAlign: "center",
                  color: "#9ca3af",
                  fontSize: "0.875rem",
                  marginTop: 16
                }}
              >
                Connect your wallet to create a bet
              </p>
            ) : needsApproval ? (
              <button
                className="btn btn-secondary"
                style={{ width: "100%", padding: 16, borderRadius: 12, background: "#f9fafb", color: "#4b5563", border: "1px solid #e5e7eb", fontWeight: 700, cursor: approving || !formValid ? "not-allowed" : "pointer", opacity: approving || !formValid ? 0.6 : 1 }}
                onClick={handleApprove}
                disabled={approving || !formValid}
              >
                {approving ? "Approving..." : `Step 1: Approve $${amount} USDC`}
              </button>
            ) : (
              <button
                className="btn btn-primary"
                style={{ width: "100%", padding: 16, borderRadius: 12, background: "linear-gradient(135deg,#7C3AED,#9B5CFF)", color: "#fff", border: "none", fontWeight: 700, cursor: creating || !formValid ? "not-allowed" : "pointer", opacity: creating || !formValid ? 0.6 : 1, boxShadow: "0 4px 16px rgba(124,58,237,0.3)" }}
                onClick={handleCreate}
                disabled={creating || !formValid}
              >
                {creating ? "Creating..." : `Create Bet — Deposit $${amount} USDC`}
              </button>
            )}
          </div>

          {/* Preview card */}
          <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
            <h3 style={{ fontSize: "0.9rem", color: "#6b7280", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em" }}>
              Preview
            </h3>
            <div
              className="card"
              style={{
                borderColor: condition ? "rgba(124,58,237,0.3)" : "#e5e7eb",
                transition: "border-color 0.2s",
                background: "#ffffff",
                padding: 24,
                borderRadius: 20,
                borderStyle: "solid",
                borderWidth: 1,
                boxShadow: "0 4px 16px rgba(0,0,0,0.02)"
              }}
            >
              {/* Condition preview */}
              <p
                style={{
                  fontWeight: 600,
                  fontSize: "1rem",
                  lineHeight: 1.5,
                  marginBottom: "1.25rem",
                  color: condition ? "#111827" : "#9ca3af",
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
                    color: "#16a34a",
                  },
                  {
                    icon: <Trophy size={14} />,
                    label: "Winner receives",
                    value: `$${(amount * 2 * 0.97).toFixed(2)} USDC`,
                    color: "#d97706",
                  },
                  {
                    icon: <Shield size={14} />,
                    label: "Judge",
                    value: judge
                      ? `${judge.slice(0, 6)}...${judge.slice(-4)}`
                      : "Not set",
                    color: "#4b5563",
                  },
                  {
                    icon: <Clock size={14} />,
                    label: "Deadline",
                    value: deadlineDate
                      ? `${deadlineDate} ${deadlineTime}`
                      : "Not set",
                    color: "#4b5563",
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
                        color: "#6b7280",
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

              <div className="divider" style={{ margin: "1rem 0", height: 1, background: "#e5e7eb" }} />

              <div
                style={{
                  background: "#f9fafb",
                  borderRadius: "12px",
                  padding: "0.75rem",
                  fontSize: "0.8rem",
                  color: "#6b7280",
                  display: "flex",
                  gap: "0.5rem",
                  alignItems: "flex-start",
                  border: "1px solid #e5e7eb"
                }}
              >
                <Shield size={14} style={{ flexShrink: 0, marginTop: "1px", color: "#16a34a" }} />
                <span>
                  Funds are locked in a smart contract until the judge calls the winner. 3%
                  platform fee applies.
                </span>
              </div>
            </div>

            {/* Trust badges */}
            <div style={{ display: "flex", flexDirection: "column", gap: 10, padding: "0 10px" }}>
              {[
                { icon: <Users size={14} color="#7C3AED" />, text: "Share link after creation" },
                { icon: <Shield size={14} color="#16a34a" />, text: "Funds locked on-chain" },
                { icon: <Clock size={14} color="#0891B2" />, text: "Auto-paid on resolution" },
              ].map((item, i) => (
                <div
                  key={i}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "0.5rem",
                    color: "#6b7280",
                    fontSize: "0.85rem",
                    fontWeight: 500
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
    </div>
  );
}
