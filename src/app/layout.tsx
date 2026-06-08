import type { Metadata } from "next";
import { Inter, Space_Grotesk } from "next/font/google";
import "./globals.css";
import { ThirdwebProvider } from "thirdweb/react";
import { Toaster } from "react-hot-toast";
import Header from "@/components/layout/Header";
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
          background: "#FFFFFF",
          color: "#111827",
          fontFamily: "var(--font-inter), sans-serif",
          margin: 0,
          padding: 0,
          minHeight: "100vh",
        }}
      >
        <ThirdwebProvider>
          {/* Subtle light background accent */}
          <div
            aria-hidden
            style={{
              position: "fixed",
              inset: 0,
              zIndex: 0,
              background:
                "radial-gradient(ellipse 80% 60% at 50% -10%, rgba(124,58,237,0.06) 0%, transparent 60%)," +
                "#FFFFFF",
              pointerEvents: "none",
            }}
          />

          {/* Site wrapper */}
          <div style={{ position: "relative", zIndex: 1, display: "flex", flexDirection: "column", minHeight: "100vh" }}>
            <Header />
            <main style={{ flex: 1 }}>{children}</main>
          </div>

          <Toaster
            position="bottom-right"
            toastOptions={{
              style: {
                background: "#ffffff",
                color: "#111827",
                border: "1px solid rgba(0,0,0,0.08)",
                borderRadius: "12px",
                fontSize: "0.875rem",
                boxShadow: "0 4px 24px rgba(0,0,0,0.08)",
              },
            }}
          />
        </ThirdwebProvider>
      </body>
    </html>
  );
}
