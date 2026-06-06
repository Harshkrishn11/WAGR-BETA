import type { Metadata } from "next";
import { Inter, Space_Grotesk } from "next/font/google";
import "./globals.css";
import { ThirdwebProvider } from "thirdweb/react";
import { Toaster } from "react-hot-toast";
import Header from "@/components/layout/Header";
import InviteGate from "@/components/InviteGate";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });
const spaceGrotesk = Space_Grotesk({ subsets: ["latin"], variable: "--font-space-grotesk" });

export const metadata: Metadata = {
  title: "WAGR — Prove It. Win It.",
  description: "The on-chain betting platform on Base. Play daily games, bet friends, and win USDC.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${inter.variable} ${spaceGrotesk.variable}`}
        style={{
          background: "#0B0B13",
          color: "#f5f5f5",
          fontFamily: "var(--font-inter), sans-serif",
          margin: 0,
          padding: 0,
          minHeight: "100vh",
        }}
      >
        <ThirdwebProvider>
          {/* Global radial background — fixed behind everything */}
          <div
            aria-hidden
            style={{
              position: "fixed",
              inset: 0,
              zIndex: 0,
              background:
                "radial-gradient(ellipse 80% 60% at 20% 10%, rgba(155,92,255,0.14) 0%, transparent 60%)," +
                "radial-gradient(ellipse 60% 50% at 80% 90%, rgba(0,212,255,0.07) 0%, transparent 60%)," +
                "#0B0B13",
              pointerEvents: "none",
            }}
          />

          {/* Site wrapper — stacks header / main / footer */}
          <div style={{ position: "relative", zIndex: 1, display: "flex", flexDirection: "column", minHeight: "100vh" }}>
            <InviteGate>
              <Header />
              <main style={{ flex: 1 }}>{children}</main>
            </InviteGate>
          </div>

          <Toaster
            position="bottom-right"
            toastOptions={{
              style: {
                background: "#18181b",
                color: "#fff",
                border: "1px solid rgba(255,255,255,0.08)",
                borderRadius: "12px",
                fontSize: "0.875rem",
              },
            }}
          />
        </ThirdwebProvider>
      </body>
    </html>
  );
}
