"use client";

import React from "react";
import { motion } from "framer-motion";
import { BookOpen, Shield, Zap, Target } from "lucide-react";
import Footer from "@/components/Footer";

const W = (children: React.ReactNode) => (
  <div style={{ maxWidth: 900, margin: "0 auto", padding: "0 24px", width: "100%" }}>{children}</div>
);

function TableRow({ col1, col2, col3 }: { col1: string; col2: string; col3: string }) {
  return (
    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 2fr", gap: 16, padding: "16px 0", borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
      <div style={{ fontSize: 15, fontWeight: 700, color: "rgba(255,255,255,0.9)" }}>{col1}</div>
      <div style={{ fontSize: 15, fontFamily: "monospace", color: "#34D399", fontWeight: 700 }}>{col2}</div>
      <div style={{ fontSize: 14, color: "rgba(255,255,255,0.5)", lineHeight: 1.6 }}>{col3}</div>
    </div>
  );
}

function Section({ title, children, delay = 0, icon: Icon }: { title: string; children: React.ReactNode; delay?: number; icon?: any }) {
  return (
    <motion.section
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, delay }}
      style={{ marginBottom: 64 }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 24 }}>
        {Icon && <div style={{ padding: 8, borderRadius: 10, background: "rgba(168,85,247,0.1)", border: "1px solid rgba(168,85,247,0.2)" }}><Icon size={20} color="#A855F7" /></div>}
        <h2 style={{ fontSize: 28, fontWeight: 800, color: "#fff", margin: 0, fontFamily: "var(--font-space-grotesk,sans-serif)" }}>{title}</h2>
      </div>
      <div style={{ color: "rgba(255,255,255,0.6)", fontSize: 16, lineHeight: 1.8 }}>
        {children}
      </div>
    </motion.section>
  );
}

export default function DocsPage() {
  return (
    <>
      <div style={{ position: "fixed", inset: 0, background: "#050510", zIndex: 0, pointerEvents: "none" }}>
        <div style={{ position: "absolute", top: "-10%", left: "50%", transform: "translateX(-50%)", width: 800, height: 600, background: "radial-gradient(circle, rgba(168,85,247,0.15) 0%, transparent 60%)", filter: "blur(60px)" }} />
        <div style={{ position: "absolute", inset: 0, backgroundImage: "radial-gradient(rgba(255,255,255,0.03) 1px, transparent 1px)", backgroundSize: "32px 32px" }} />
      </div>

      <div style={{ position: "relative", zIndex: 1, paddingTop: 120, paddingBottom: 80 }}>
        {W(
          <>
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
              style={{ textAlign: "center", marginBottom: 80 }}
            >
              <div style={{ display: "inline-flex", alignItems: "center", gap: 8, padding: "6px 16px", borderRadius: 99, background: "rgba(6,182,212,0.1)", border: "1px solid rgba(6,182,212,0.2)", marginBottom: 24 }}>
                <BookOpen size={14} color="#06B6D4" />
                <span style={{ fontSize: 11, fontFamily: "monospace", letterSpacing: "0.1em", textTransform: "uppercase", color: "#06B6D4", fontWeight: 700 }}>Lite Documentation</span>
              </div>
              <h1 style={{ fontSize: "clamp(3rem, 6vw, 4.5rem)", fontWeight: 900, color: "#fff", margin: "0 0 20px", fontFamily: "var(--font-space-grotesk,sans-serif)", letterSpacing: "-0.03em", lineHeight: 1.1 }}>
                WAGR <span className="grad-purple-cyan">Guide</span>
              </h1>
              <p style={{ fontSize: 18, color: "rgba(255,255,255,0.45)", maxWidth: 600, margin: "0 auto", lineHeight: 1.6 }}>
                A simple, clear, and non technical understanding of what WAGR is, how it operates, and how you can start using it.
              </p>
            </motion.div>

            <div style={{ background: "rgba(10,10,20,0.6)", border: "1px solid rgba(255,255,255,0.05)", borderRadius: 32, padding: "40px clamp(20px, 5vw, 60px)", backdropFilter: "blur(20px)" }}>
              
              <Section title="1. What is WAGR?" icon={Target} delay={0.1}>
                <p style={{ margin: "0 0 16px" }}>
                  WAGR is a decentralized, user generated prediction engine built natively on the Base ecosystem. Traditional prediction markets are slow, corporate, and limited to major macroeconomic events.
                </p>
                <p style={{ margin: 0 }}>
                  WAGR changes this by allowing anyone to instantly launch a custom prediction pool on internet culture, trending topics, or private group chat debates.
                </p>
              </Section>

              <Section title="2. Core Features" icon={Zap} delay={0.2}>
                <div style={{ marginBottom: 32 }}>
                  <h3 style={{ fontSize: 20, color: "#fff", fontWeight: 700, marginBottom: 12 }}>Broadcast Pools</h3>
                  <p style={{ margin: 0 }}>
                    Built specifically for creators, influencers, and community leaders. You can create a public prediction pool based on any trending discussion, share the unique link with your followers, and earn a flat 2% creator royalty from the total pool volume. Your distribution drives your revenue.
                  </p>
                </div>
                <div>
                  <h3 style={{ fontSize: 20, color: "#fff", fontWeight: 700, marginBottom: 12 }}>Bet a Friend (P2P)</h3>
                  <p style={{ margin: 0 }}>
                    Designed to bring trustless betting into private group chats. When you have a disagreement with friends in a chat room, you can spin up an unlisted pool and send them the direct link. Both parties lock their USDC into a secure smart contract escrow, ensuring the winner is automatically paid out without any real world disputes.
                  </p>
                </div>
              </Section>

              <Section title="3. Step by Step User Guide" icon={BookOpen} delay={0.3}>
                <ol style={{ paddingLeft: 20, margin: 0, display: "flex", flexDirection: "column", gap: 16 }}>
                  <li><strong style={{ color: "rgba(255,255,255,0.9)" }}>Connect Your Wallet:</strong> Open the WAGR platform and securely connect your Web3 wallet on the Base network.</li>
                  <li><strong style={{ color: "rgba(255,255,255,0.9)" }}>Create Your Pool:</strong> Enter your prediction question, set the possible outcomes, and establish the parameters.</li>
                  <li><strong style={{ color: "rgba(255,255,255,0.9)" }}>Share the Link:</strong> Copy the generated link and paste it into your Twitter thread, Telegram group, or Discord channel.</li>
                  <li><strong style={{ color: "rgba(255,255,255,0.9)" }}>Claim Your Payout:</strong> Once the event concludes and resolves, winners can instantly claim their funds and creators receive their royalties.</li>
                </ol>
              </Section>

              <Section title="4. Platform Fees and Economics" delay={0.4}>
                <p style={{ margin: "0 0 24px" }}>
                  WAGR is structured to ensure absolute transparency. The distribution of funds within any given pool follows a strict allocation model:
                </p>
                <div style={{ background: "rgba(0,0,0,0.3)", borderRadius: 16, padding: "0 24px", border: "1px solid rgba(255,255,255,0.05)" }}>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 2fr", gap: 16, padding: "16px 0", borderBottom: "1px solid rgba(255,255,255,0.1)", fontSize: 13, textTransform: "uppercase", letterSpacing: "0.1em", color: "rgba(255,255,255,0.4)", fontWeight: 700 }}>
                    <div>Allocation Type</div>
                    <div>Percentage</div>
                    <div>Description</div>
                  </div>
                  <TableRow col1="Winner Pool" col2="97%" col3="Distributed proportionally among the users who predicted the correct outcome." />
                  <TableRow col1="Creator Royalty" col2="2%" col3="Sent directly to the wallet of the user who initially created and shared the pool." />
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 2fr", gap: 16, padding: "16px 0" }}>
                    <div style={{ fontSize: 15, fontWeight: 700, color: "rgba(255,255,255,0.9)" }}>Protocol Fee</div>
                    <div style={{ fontSize: 15, fontFamily: "monospace", color: "#34D399", fontWeight: 700 }}>1%</div>
                    <div style={{ fontSize: 14, color: "rgba(255,255,255,0.5)", lineHeight: 1.6 }}>Retained by the platform to support ongoing development, maintenance, and server costs.</div>
                  </div>
                </div>
              </Section>

              <Section title="5. Market Resolution" delay={0.5}>
                <p style={{ margin: 0 }}>
                  During the current incentivized testnet phase, all prediction pools are resolved via an Admin Resolved model. This approach protects user test funds and allows the team to fix technical bugs instantly. Following our mainnet deployment, WAGR will implement a fully decentralized oracle network to guarantee completely trustless, automated resolution for every market.
                </p>
              </Section>

              <Section title="6. Dispute and Penalty System" icon={Shield} delay={0.6}>
                <p style={{ margin: "0 0 32px" }}>
                  To ensure absolute fairness, WAGR incorporates a robust dispute resolution system to protect users from bad actors.
                </p>
                
                <div style={{ marginBottom: 32 }}>
                  <h3 style={{ fontSize: 20, color: "#fff", fontWeight: 700, marginBottom: 12 }}>How Disputes Work</h3>
                  <p style={{ margin: 0 }}>
                    If a user believes a market has been resolved incorrectly by the creator or admin, they can raise a formal dispute. A panel of independent, decentralized judges will then review the evidence. If the dispute is valid, the market resolution is corrected and payouts are distributed to the rightful winners.
                  </p>
                </div>

                <div>
                  <h3 style={{ fontSize: 20, color: "#fff", fontWeight: 700, marginBottom: 16 }}>Penalty System</h3>
                  <p style={{ margin: "0 0 24px" }}>
                    Bad actors face strict consequences to keep the platform safe. If a market creator intentionally tries to resolve a market with a false outcome to cheat players, they will face severe penalties.
                  </p>
                  
                  <div style={{ background: "rgba(0,0,0,0.3)", borderRadius: 16, padding: "0 24px", border: "1px solid rgba(255,255,255,0.05)" }}>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 2fr", gap: 16, padding: "16px 0", borderBottom: "1px solid rgba(255,255,255,0.1)", fontSize: 13, textTransform: "uppercase", letterSpacing: "0.1em", color: "rgba(255,255,255,0.4)", fontWeight: 700 }}>
                      <div>Action</div>
                      <div>Consequence</div>
                      <div>Details</div>
                    </div>
                    <TableRow col1="False Resolution Attempt" col2="Slashed Stake" col3="The creator loses their staked deposit for attempting fraud." />
                    <TableRow col1="Repeated Offenses" col2="Wallet Ban" col3="The offending wallet address is permanently banned from creating future markets." />
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 2fr", gap: 16, padding: "16px 0" }}>
                      <div style={{ fontSize: 15, fontWeight: 700, color: "rgba(255,255,255,0.9)" }}>Invalid Disputes</div>
                      <div style={{ fontSize: 15, fontFamily: "monospace", color: "#F43F5E", fontWeight: 700 }}>Dispute Fee Loss</div>
                      <div style={{ fontSize: 14, color: "rgba(255,255,255,0.5)", lineHeight: 1.6 }}>Users who spam fake disputes lose their initial dispute deposit fee.</div>
                    </div>
                  </div>
                </div>
              </Section>

            </div>
          </>
        )}
      </div>
      <Footer />
    </>
  );
}
