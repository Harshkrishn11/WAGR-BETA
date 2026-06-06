"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ConnectButton, useActiveAccount, useReadContract } from "thirdweb/react";
import { createWallet } from "thirdweb/wallets";
import { client } from "@/lib/thirdweb";
import { activeChain, getUSDCContract } from "@/lib/contracts";
import { formatUSDC } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";
import { TrendingUp, PlusCircle, Users, LayoutDashboard, X, Menu, BookOpen } from "lucide-react";

const wallets = [
  createWallet("io.metamask"),
  createWallet("com.coinbase.wallet"),
  createWallet("me.rainbow"),
  createWallet("io.rabby"),
  createWallet("io.zerion.wallet"),
];

const navLinks = [
  { href: "/markets",    label: "Markets",     Icon: TrendingUp },
  { href: "/create",     label: "Create",      Icon: PlusCircle },
  { href: "/bet/create", label: "Friend Bet",  Icon: Users },
  { href: "/dashboard",  label: "Activity",    Icon: LayoutDashboard },
  { href: "/docs",       label: "Docs",        Icon: BookOpen },
];

export default function Header() {
  const pathname = usePathname();
  const account = useActiveAccount();
  const [menuOpen, setMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => { setMenuOpen(false); }, [pathname]);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const usdcContract = getUSDCContract();
  const { data: usdcBalance } = useReadContract({
    contract: usdcContract,
    method: "balanceOf",
    params: account ? [account.address] : ["0x0000000000000000000000000000000000000000"],
    queryOptions: { enabled: !!account },
  });

  return (
    <>
      <header style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        zIndex: 1000,
        transition: "all 0.4s ease",
        background: scrolled ? "rgba(6,6,16,0.92)" : "rgba(6,6,16,0.5)",
        backdropFilter: "blur(24px)",
        WebkitBackdropFilter: "blur(24px)",
        borderBottom: scrolled ? "1px solid rgba(255,255,255,0.07)" : "1px solid transparent",
      }}>
        <div style={{ maxWidth: 1200, margin: "0 auto", padding: "0 24px", display: "flex", alignItems: "center", justifyContent: "space-between", height: 68, gap: 16 }}>

          {/* Logo */}
          <Link href="/" style={{ textDecoration: "none", flexShrink: 0, display: "flex", alignItems: "center", gap: 10 }}>
            <motion.div
              whileHover={{ scale: 1.08, rotate: -5 }}
              whileTap={{ scale: 0.95 }}
              style={{
                width: 36, height: 36, borderRadius: 10,
                background: "linear-gradient(135deg, #7C3AED, #A855F7, #06B6D4)",
                display: "flex", alignItems: "center", justifyContent: "center",
                boxShadow: "0 0 24px rgba(124,58,237,0.6), 0 0 48px rgba(6,182,212,0.2)",
              }}
            >
              <span style={{ fontSize: 18, fontWeight: 900, color: "#fff", fontFamily: "monospace", lineHeight: 1 }}>W</span>
            </motion.div>
            <span style={{ fontSize: 20, fontWeight: 900, letterSpacing: "-0.04em", color: "#fff", fontFamily: "var(--font-space-grotesk,sans-serif)" }}>
              WAGR
            </span>
          </Link>

          {/* Desktop Nav */}
          <nav className="desktop-nav" style={{ display: "flex", gap: 2, alignItems: "center" }}>
            {navLinks.map((link) => {
              const isActive = pathname === link.href;
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  style={{
                    padding: "7px 16px",
                    borderRadius: 10,
                    fontSize: 14,
                    fontWeight: 600,
                    textDecoration: "none",
                    color: isActive ? "#fff" : "rgba(255,255,255,0.45)",
                    background: isActive ? "rgba(255,255,255,0.07)" : "transparent",
                    border: isActive ? "1px solid rgba(255,255,255,0.1)" : "1px solid transparent",
                    transition: "all 0.2s ease",
                    display: "flex",
                    alignItems: "center",
                    gap: 6,
                  }}
                  onMouseEnter={e => {
                    if (!isActive) {
                      (e.currentTarget as HTMLElement).style.color = "rgba(255,255,255,0.8)";
                      (e.currentTarget as HTMLElement).style.background = "rgba(255,255,255,0.04)";
                    }
                  }}
                  onMouseLeave={e => {
                    if (!isActive) {
                      (e.currentTarget as HTMLElement).style.color = "rgba(255,255,255,0.45)";
                      (e.currentTarget as HTMLElement).style.background = "transparent";
                    }
                  }}
                >
                  <link.Icon size={14} />
                  {link.label}
                  {link.href === "/create" && (
                    <span style={{ fontSize: 8, padding: "1px 5px", borderRadius: 4, background: "linear-gradient(135deg,#7C3AED,#9B5CFF)", color: "#fff", fontFamily: "monospace", fontWeight: 800, letterSpacing: "0.05em" }}>NEW</span>
                  )}
                </Link>
              );
            })}
          </nav>

          {/* Right: Balance + Connect + Mobile toggle */}
          <div style={{ display: "flex", alignItems: "center", gap: 10, flexShrink: 0 }}>
            {account && usdcBalance !== undefined && (
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="desktop-nav"
                style={{
                  background: "rgba(0,255,136,0.06)",
                  border: "1px solid rgba(0,255,136,0.15)",
                  borderRadius: 10,
                  padding: "6px 14px",
                  fontSize: 13,
                  fontWeight: 700,
                  color: "#00FF88",
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                  fontFamily: "monospace",
                }}
              >
                <span style={{ fontSize: 10, color: "rgba(255,255,255,0.3)", fontWeight: 400 }}>USDC</span>
                {formatUSDC(usdcBalance)}
              </motion.div>
            )}

            <ConnectButton
              client={client}
              chain={activeChain}
              wallets={wallets}
              connectButton={{
                label: "Connect",
                style: {
                  background: "linear-gradient(135deg, #7c3aed, #9B5CFF)",
                  color: "white",
                  border: "none",
                  borderRadius: "10px",
                  padding: "8px 18px",
                  fontWeight: 700,
                  fontSize: "13px",
                  cursor: "pointer",
                  fontFamily: "inherit",
                  boxShadow: "0 0 24px rgba(124,58,237,0.4)",
                  letterSpacing: "0.01em",
                },
              }}
              detailsButton={{
                style: {
                  background: "rgba(255,255,255,0.06)",
                  color: "rgba(255,255,255,0.9)",
                  border: "1px solid rgba(255,255,255,0.1)",
                  borderRadius: "10px",
                  padding: "7px 14px",
                  fontWeight: 600,
                  fontSize: "13px",
                  cursor: "pointer",
                  fontFamily: "inherit",
                },
              }}
            />

            {/* Mobile Toggle */}
            <button
              className="mobile-toggle"
              onClick={() => setMenuOpen(!menuOpen)}
              style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)", color: "white", cursor: "pointer", padding: "7px", display: "flex", alignItems: "center", justifyContent: "center", borderRadius: 10, transition: "all 0.2s" }}
            >
              {menuOpen ? <X size={20} /> : <Menu size={20} />}
            </button>
          </div>
        </div>

        {/* Mobile Menu */}
        <AnimatePresence>
          {menuOpen && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2, ease: "easeOut" }}
              className="mobile-menu"
              style={{
                position: "absolute",
                top: 68,
                left: 0,
                right: 0,
                background: "rgba(6,6,16,0.98)",
                borderBottom: "1px solid rgba(255,255,255,0.07)",
                backdropFilter: "blur(24px)",
                padding: "16px",
                display: "flex",
                flexDirection: "column",
                gap: 6,
                zIndex: 999,
              }}
            >
              {navLinks.map((link, i) => {
                const isActive = pathname === link.href;
                return (
                  <motion.div
                    key={link.href}
                    initial={{ opacity: 0, x: -16 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.05 }}
                  >
                    <Link
                      href={link.href}
                      style={{
                        padding: "14px 16px",
                        borderRadius: 12,
                        fontSize: 15,
                        fontWeight: 600,
                        textDecoration: "none",
                        color: isActive ? "#fff" : "rgba(255,255,255,0.5)",
                        background: isActive ? "rgba(155,92,255,0.1)" : "rgba(255,255,255,0.02)",
                        border: isActive ? "1px solid rgba(155,92,255,0.2)" : "1px solid transparent",
                        display: "flex",
                        alignItems: "center",
                        gap: 10,
                      }}
                    >
                      <link.Icon size={16} color={isActive ? "#9B5CFF" : undefined} />
                      {link.label}
                    </Link>
                  </motion.div>
                );
              })}
            </motion.div>
          )}
        </AnimatePresence>
      </header>

      {/* Spacer so content doesn't go behind fixed header */}
      <div style={{ height: 68 }} />

      <style>{`
        @media (max-width: 720px) {
          .desktop-nav { display: none !important; }
        }
        @media (min-width: 721px) {
          .mobile-toggle, .mobile-menu { display: none !important; }
        }
      `}</style>
    </>
  );
}
