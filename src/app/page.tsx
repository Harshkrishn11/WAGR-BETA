"use client";

import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useReadContract } from "thirdweb/react";
import { getPredictionMarketContract } from "@/lib/contracts";
import { ArrowRight, Zap, Shield, BarChart3, Globe, TrendingUp, Users } from "lucide-react";
import Footer from "@/components/Footer";

const W = (children: React.ReactNode, maxW = 1200) => (
  <div style={{ maxWidth: maxW, margin: "0 auto", padding: "0 24px", width: "100%" }}>{children}</div>
);

/* ═══ LIVELY BACKGROUND ══════════════════════════════════════════ */
function Background() {
  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 0, pointerEvents: "none", overflow: "hidden", background: "#050510" }}>
      {/* Colour blobs */}
      <motion.div animate={{ x: [0,80,0], y: [0,-60,0], scale:[1,1.2,1] }} transition={{ duration:20, repeat:Infinity, ease:"easeInOut" }}
        style={{ position:"absolute", top:"-5%", left:"10%", width:700, height:700, borderRadius:"50%", background:"radial-gradient(circle, rgba(120,40,255,0.35) 0%, transparent 70%)", filter:"blur(60px)" }} />
      <motion.div animate={{ x:[0,-60,0], y:[0,80,0], scale:[1,1.3,1] }} transition={{ duration:25, repeat:Infinity, ease:"easeInOut", delay:3 }}
        style={{ position:"absolute", top:"20%", right:"-5%", width:600, height:600, borderRadius:"50%", background:"radial-gradient(circle, rgba(0,200,255,0.25) 0%, transparent 70%)", filter:"blur(60px)" }} />
      <motion.div animate={{ x:[0,50,-30,0], y:[0,-40,60,0] }} transition={{ duration:30, repeat:Infinity, ease:"easeInOut", delay:6 }}
        style={{ position:"absolute", bottom:"10%", left:"25%", width:500, height:500, borderRadius:"50%", background:"radial-gradient(circle, rgba(255,60,180,0.2) 0%, transparent 70%)", filter:"blur(70px)" }} />
      <motion.div animate={{ x:[0,-40,0], y:[0,40,0] }} transition={{ duration:18, repeat:Infinity, ease:"easeInOut", delay:10 }}
        style={{ position:"absolute", bottom:"5%", right:"20%", width:400, height:400, borderRadius:"50%", background:"radial-gradient(circle, rgba(255,200,0,0.15) 0%, transparent 70%)", filter:"blur(60px)" }} />

      {/* Dot grid */}
      <div style={{ position:"absolute", inset:0, backgroundImage:"radial-gradient(rgba(255,255,255,0.06) 1px, transparent 1px)", backgroundSize:"40px 40px" }} />
      {/* Edge vignette */}
      <div style={{ position:"absolute", inset:0, background:"radial-gradient(ellipse 100% 100% at 50% 50%, transparent 50%, #050510 100%)" }} />
    </div>
  );
}

/* ═══ FLOATING PARTICLES ═════════════════════════════════════════ */
function Sparks() {
  const sparks = Array.from({ length: 30 }, (_, i) => ({
    id: i,
    x: Math.random() * 100,
    y: 100 - Math.random() * 40,
    color: ["#A855F7","#06B6D4","#F43F5E","#FBBF24","#34D399","#818CF8"][Math.floor(Math.random()*6)],
    size: Math.random() * 3 + 1,
    dur: Math.random() * 10 + 7,
    delay: Math.random() * 10,
  }));
  return (
    <div style={{ position:"fixed", inset:0, zIndex:0, pointerEvents:"none" }}>
      {sparks.map(s => (
        <motion.div key={s.id}
          animate={{ y: [0, -(Math.random()*300+200)], opacity:[0,1,0] }}
          transition={{ duration:s.dur, repeat:Infinity, delay:s.delay, ease:"easeOut" }}
          style={{ position:"absolute", left:`${s.x}%`, top:`${s.y}%`, width:s.size, height:s.size, borderRadius:"50%", background:s.color, boxShadow:`0 0 ${s.size*4}px ${s.color}` }}
        />
      ))}
    </div>
  );
}

/* ═══ COUNTDOWN ══════════════════════════════════════════════════ */
function Countdown({ endTime }: { endTime: number }) {
  const [t, setT] = useState({ h:0, m:0, s:0 });
  useEffect(() => {
    const c = () => { const d = Math.max(0,endTime-Math.floor(Date.now()/1000)); setT({h:Math.floor(d/3600),m:Math.floor((d%3600)/60),s:d%60}); };
    c(); const id = setInterval(c,1000); return () => clearInterval(id);
  }, [endTime]);
  const f = (n:number) => String(n).padStart(2,"0");
  return <span style={{ fontFamily:"monospace", fontSize:10, color:"#34D399", background:"rgba(52,211,153,0.1)", padding:"2px 8px", borderRadius:6, border:"1px solid rgba(52,211,153,0.2)" }}>{f(t.h)}:{f(t.m)}:{f(t.s)}</span>;
}

const CATCLR: Record<string,string> = { Crypto:"#A855F7", Politics:"#3B82F6", Sports:"#06B6D4", Tech:"#34D399", Macro:"#F59E0B", Entertainment:"#F43F5E", Science:"#8B5CF6", Others:"#64748B" };

/* ═══ MARKET CARD ════════════════════════════════════════════════ */
function MarketCard({ marketId, index }: { marketId:number; index:number }) {
  const contract = getPredictionMarketContract();
  const { data, isLoading } = useReadContract({ contract:contract??undefined, method:"getMarket", params:[BigInt(marketId)], queryOptions:{enabled:!!contract} } as any);
  const { data: yesPool } = useReadContract({ contract:contract??undefined, method:"getOptionPool", params:[BigInt(marketId),0], queryOptions:{enabled:!!contract} } as any);
  const { data: noPool }  = useReadContract({ contract:contract??undefined, method:"getOptionPool", params:[BigInt(marketId),1], queryOptions:{enabled:!!contract} } as any);
  const router = useRouter();

  if (isLoading) return <div style={{ height:230, borderRadius:20, background:"rgba(255,255,255,0.02)", border:"1px solid rgba(255,255,255,0.05)", animation:"pulse 2s infinite" }} />;
  if (!data) return null;

  const { question, category, deadline:endTime, status, totalPool } = data as any;
  if (Number(status)===3) return null;

  const yes = Number(yesPool??0n), no = Number(noPool??0n), sum = yes+no;
  const yP = sum>0 ? Math.round((yes/sum)*100) : 50;
  const total = Number(totalPool)/1e6;
  const clr = CATCLR[category] ?? "#A855F7";
  const isActive = Number(status)===0;

  return (
    <motion.div
      initial={{ opacity:0, y:30 }} whileInView={{ opacity:1, y:0 }} viewport={{ once:true }}
      transition={{ duration:0.6, delay:index*0.07, ease:[0.22,1,0.36,1] }}
      whileHover={{ y:-8, transition:{duration:0.22} }}
      onClick={() => router.push(`/markets/${marketId}`)}
      style={{ borderRadius:20, background:`linear-gradient(145deg, rgba(15,10,35,0.9) 0%, rgba(8,8,25,0.95) 100%)`, border:`1px solid ${clr}25`, padding:22, display:"flex", flexDirection:"column", gap:14, cursor:"pointer", position:"relative", overflow:"hidden", transition:"border-color 0.3s, box-shadow 0.3s" }}
      onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor=`${clr}60`; (e.currentTarget as HTMLElement).style.boxShadow=`0 0 40px ${clr}20, 0 20px 60px rgba(0,0,0,0.4)`; }}
      onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor=`${clr}25`; (e.currentTarget as HTMLElement).style.boxShadow="none"; }}
    >
      {/* Glow top-left corner */}
      <div style={{ position:"absolute", top:-40, left:-40, width:120, height:120, background:`${clr}20`, filter:"blur(40px)", borderRadius:"50%", pointerEvents:"none" }} />
      {/* Top accent */}
      <div style={{ position:"absolute", top:0, left:0, right:0, height:2, background:`linear-gradient(90deg, transparent 0%, ${clr}90 50%, transparent 100%)` }} />

      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center" }}>
        <span style={{ fontSize:10, fontFamily:"monospace", letterSpacing:"0.1em", textTransform:"uppercase", padding:"4px 12px", borderRadius:99, background:`${clr}18`, border:`1px solid ${clr}40`, color:clr, fontWeight:700 }}>{category||"Crypto"}</span>
        {isActive ? <Countdown endTime={Number(endTime)} /> : <span style={{ fontSize:9, padding:"3px 10px", borderRadius:6, background:"rgba(100,116,139,0.15)", color:"#64748B", border:"1px solid rgba(100,116,139,0.3)", fontFamily:"monospace" }}>SETTLED</span>}
      </div>

      <p style={{ fontSize:15, fontWeight:600, color:"rgba(255,255,255,0.92)", lineHeight:1.55, margin:0, flex:1 }}>{question}</p>

      <div>
        <div style={{ display:"flex", justifyContent:"space-between", marginBottom:6 }}>
          <span style={{ fontSize:11, fontFamily:"monospace", fontWeight:700, color:"#34D399" }}>YES {yP}%</span>
          <span style={{ fontSize:11, fontFamily:"monospace", fontWeight:700, color:"#F43F5E" }}>NO {100-yP}%</span>
        </div>
        <div style={{ height:8, background:"rgba(255,255,255,0.06)", borderRadius:99, overflow:"hidden", display:"flex" }}>
          <motion.div initial={{width:0}} whileInView={{width:`${yP}%`}} viewport={{once:true}} transition={{duration:1, delay:index*0.1+0.4, ease:"easeOut"}}
            style={{ background:"linear-gradient(90deg,#059669,#34D399)", boxShadow:"0 0 10px rgba(52,211,153,0.5)" }} />
          <motion.div initial={{width:0}} whileInView={{width:`${100-yP}%`}} viewport={{once:true}} transition={{duration:1, delay:index*0.1+0.4, ease:"easeOut"}}
            style={{ background:"linear-gradient(90deg,#E11D48,#F43F5E)" }} />
        </div>
      </div>

      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center" }}>
        <span style={{ fontSize:12, fontFamily:"monospace", color:"rgba(255,255,255,0.3)" }}>Pool: <strong style={{ color:"rgba(255,255,255,0.7)" }}>${total.toLocaleString("en-US",{maximumFractionDigits:2})}</strong></span>
        <span style={{ fontSize:11, fontFamily:"monospace", color:clr, display:"flex", alignItems:"center", gap:4 }}>Predict <ArrowRight size={11} /></span>
      </div>
    </motion.div>
  );
}

/* ═══ TICKER ═════════════════════════════════════════════════════ */
const TICKERS = [
  {q:"Will BTC hit $150k in 2025?", yes:74}, {q:"ETH ETF approved?", yes:58},
  {q:"India wins T20 World Cup?", yes:41}, {q:"Tesla $500 by Dec?", yes:33},
  {q:"Fed cuts rates in Sep?", yes:67}, {q:"GPT-5 released in 2025?", yes:82},
];

function LiveTicker() {
  const all = [...TICKERS,...TICKERS,...TICKERS];
  return (
    <div style={{ overflow:"hidden", position:"relative", borderTop:"1px solid rgba(255,255,255,0.06)", borderBottom:"1px solid rgba(255,255,255,0.06)", background:"rgba(5,5,20,0.8)", padding:"10px 0" }}>
      <div style={{ position:"absolute", left:0, top:0, bottom:0, width:80, background:"linear-gradient(90deg,#050510,transparent)", zIndex:2, pointerEvents:"none" }} />
      <div style={{ position:"absolute", right:0, top:0, bottom:0, width:80, background:"linear-gradient(-90deg,#050510,transparent)", zIndex:2, pointerEvents:"none" }} />
      <motion.div animate={{ x:["0%","-33.33%"] }} transition={{ duration:40, repeat:Infinity, ease:"linear" }}
        style={{ display:"flex", alignItems:"center", gap:0, whiteSpace:"nowrap" }}>
        {all.map((t,i) => {
          const yes = t.yes; const clr = yes>=50?"#34D399":"#F43F5E";
          return (
            <div key={i} style={{ display:"inline-flex", alignItems:"center", gap:10, padding:"0 36px", borderRight:"1px solid rgba(255,255,255,0.05)" }}>
              <span style={{ width:6, height:6, borderRadius:"50%", background:clr, boxShadow:`0 0 6px ${clr}`, display:"block", flexShrink:0 }} />
              <span style={{ fontSize:12, color:"rgba(255,255,255,0.55)", fontFamily:"monospace" }}>{t.q}</span>
              <span style={{ fontSize:12, fontWeight:800, color:clr, fontFamily:"monospace" }}>{yes}%</span>
            </div>
          );
        })}
      </motion.div>
    </div>
  );
}

/* ═══ HERO ═══════════════════════════════════════════════════════ */
function Hero() {
  const contract = getPredictionMarketContract();
  const { data: nextMarketId } = useReadContract({ contract:contract??undefined, method:"nextMarketId", params:[], queryOptions:{enabled:!!contract} } as any);
  const count = nextMarketId!==undefined ? Number(nextMarketId) : 0;

  return (
    <section style={{ position:"relative", minHeight:"100vh", display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", padding:"120px 0 60px", overflow:"hidden" }}>
      {W(
        <div style={{ display:"flex", flexDirection:"column", alignItems:"center", textAlign:"center", position:"relative", zIndex:2 }}>

          {/* LIVE BADGE */}
          <motion.div initial={{opacity:0,scale:0.7}} animate={{opacity:1,scale:1}} transition={{duration:0.6, ease:[0.22,1,0.36,1]}}
            style={{ display:"inline-flex", alignItems:"center", gap:10, marginBottom:36, padding:"8px 20px", borderRadius:999, background:"rgba(168,85,247,0.1)", border:"1px solid rgba(168,85,247,0.35)", backdropFilter:"blur(12px)" }}>
            <motion.div animate={{opacity:[1,0.2,1],scale:[1,1.4,1]}} transition={{duration:1.5,repeat:Infinity}}
              style={{ width:8, height:8, borderRadius:"50%", background:"#A855F7", boxShadow:"0 0 12px #A855F7", flexShrink:0 }} />
            <span style={{ fontSize:11, fontFamily:"monospace", letterSpacing:"0.15em", textTransform:"uppercase", color:"#C4B5FD", fontWeight:700 }}>Live · Base Testnet</span>
          </motion.div>

          {/* HEADLINE */}
          <motion.h1 className="hero-title" initial={{opacity:0,y:50}} animate={{opacity:1,y:0}} transition={{duration:1, delay:0.1, ease:[0.22,1,0.36,1]}}
            style={{ fontSize:"clamp(2.5rem,10vw,7.5rem)", fontWeight:900, lineHeight:1.1, letterSpacing:"-0.05em", fontFamily:"var(--font-space-grotesk,sans-serif)", margin:"0 0 24px" }}>
            <span style={{ display:"block", color:"#fff" }}>Create, Predict,</span>
            <span style={{ display:"block" }}>
              <span className="grad-rainbow">Win</span>
            </span>
          </motion.h1>

          {/* SUB */}
          <motion.p initial={{opacity:0,y:30}} animate={{opacity:1,y:0}} transition={{duration:0.8, delay:0.25, ease:[0.22,1,0.36,1]}}
            style={{ fontSize:"clamp(1rem,2.2vw,1.3rem)", color:"rgba(255,255,255,0.45)", maxWidth:540, lineHeight:1.75, margin:"0 0 50px" }}>
            On-chain prediction markets. Bet on crypto, sports, politics and more. Instant payouts. No middlemen ever.
          </motion.p>

          {/* CTA BUTTONS */}
          <motion.div initial={{opacity:0,y:24}} animate={{opacity:1,y:0}} transition={{duration:0.8, delay:0.35, ease:[0.22,1,0.36,1]}}
            style={{ display:"flex", gap:14, flexWrap:"wrap", justifyContent:"center", marginBottom:72 }}>
            <Link href="/markets">
              <motion.button className="mobile-btn" whileHover={{scale:1.06,boxShadow:"0 0 60px rgba(168,85,247,0.7), 0 0 120px rgba(6,182,212,0.3)"}} whileTap={{scale:0.97}}
                style={{ padding:"16px 40px", borderRadius:16, fontWeight:800, fontSize:16, color:"#fff", border:"none", cursor:"pointer", fontFamily:"var(--font-space-grotesk,sans-serif)", letterSpacing:"0.02em",
                  background:"linear-gradient(135deg, #7C3AED 0%, #A855F7 40%, #06B6D4 100%)",
                  boxShadow:"0 0 40px rgba(124,58,237,0.5), 0 0 80px rgba(6,182,212,0.2)",
                  display:"flex", alignItems:"center", gap:10 }}>
                Start Predicting <ArrowRight size={18} />
              </motion.button>
            </Link>
            <Link href="/create">
              <motion.button className="mobile-btn" whileHover={{scale:1.05, borderColor:"rgba(168,85,247,0.6)", color:"#fff"}} whileTap={{scale:0.97}}
                style={{ padding:"16px 40px", borderRadius:16, fontWeight:700, fontSize:16, color:"rgba(255,255,255,0.6)", background:"rgba(255,255,255,0.04)", border:"1px solid rgba(255,255,255,0.12)", cursor:"pointer", transition:"all 0.25s" }}>
                Create Market ✦
              </motion.button>
            </Link>
          </motion.div>

          {/* STATS */}
          <motion.div initial={{opacity:0,y:20}} animate={{opacity:1,y:0}} transition={{duration:0.8, delay:0.5}}>
            <div style={{ display:"flex", flexWrap:"wrap", justifyContent:"center", gap:1, borderRadius:20, overflow:"hidden", border:"1px solid rgba(255,255,255,0.08)", backdropFilter:"blur(20px)", background:"rgba(255,255,255,0.03)" }}>
              {[
                { label:"Markets Live", value: String(count), color:"#A855F7" },
                { label:"Auto-Payouts", value:"100%", color:"#34D399" },
                { label:"Platform Fee", value:"1%", color:"#FBBF24" },
                { label:"Network", value:"Base", color:"#06B6D4" },
              ].map((s, i, arr) => (
                <React.Fragment key={s.label}>
                  <div className="stat-block" style={{ padding:"20px 32px", display:"flex", flexDirection:"column", alignItems:"center", gap:4 }}>
                    <span className="stat-val" style={{ fontSize:26, fontWeight:900, fontFamily:"monospace", color:s.color, lineHeight:1, textShadow:`0 0 20px ${s.color}60` }}>{s.value}</span>
                    <span style={{ fontSize:10, fontFamily:"monospace", color:"rgba(255,255,255,0.3)", textTransform:"uppercase", letterSpacing:"0.12em", textAlign:"center" }}>{s.label}</span>
                  </div>
                  {i < arr.length - 1 && <div style={{ width:1, background:"rgba(255,255,255,0.06)", alignSelf:"stretch" }} />}
                </React.Fragment>
              ))}
            </div>
          </motion.div>

        </div>
      )}

      {/* Scroll hint */}
      <motion.div initial={{opacity:0}} animate={{opacity:1}} transition={{delay:1.8}}
        style={{ position:"absolute", bottom:32, left:"50%", transform:"translateX(-50%)", display:"flex", flexDirection:"column", alignItems:"center", gap:6 }}>
        <span style={{ fontSize:8, fontFamily:"monospace", color:"rgba(255,255,255,0.18)", letterSpacing:"0.2em", textTransform:"uppercase" }}>Scroll</span>
        <motion.div animate={{y:[0,10,0]}} transition={{duration:1.5, repeat:Infinity}} style={{ width:1.5, height:40, background:"linear-gradient(180deg,rgba(168,85,247,0.8),transparent)", borderRadius:99 }} />
      </motion.div>
    </section>
  );
}

/* ═══ TRENDING MARKETS ═══════════════════════════════════════════ */
function TrendingMarkets() {
  const contract = getPredictionMarketContract();
  const { data: nextMarketId } = useReadContract({ contract:contract??undefined, method:"nextMarketId", params:[], queryOptions:{enabled:!!contract} } as any);
  const total = nextMarketId!==undefined ? Number(nextMarketId) : 0;
  const ids = Array.from({length:Math.min(total,6)},(_,i)=>total-1-i).filter(i=>i>=0);

  return (
    <section style={{ padding:"100px 0", position:"relative", zIndex:1 }}>
      {W(<>
        <motion.div initial={{opacity:0,y:30}} whileInView={{opacity:1,y:0}} viewport={{once:true}} transition={{duration:0.7}} style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-end", marginBottom:48, flexWrap:"wrap", gap:16 }}>
          <div>
            <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:10 }}>
              <motion.div animate={{scale:[1,1.5,1],opacity:[1,0.4,1]}} transition={{duration:2,repeat:Infinity}}
                style={{ width:8, height:8, borderRadius:"50%", background:"#A855F7", boxShadow:"0 0 12px #A855F7" }} />
              <span style={{ fontSize:11, fontFamily:"monospace", letterSpacing:"0.15em", textTransform:"uppercase", color:"#A855F7", fontWeight:700 }}>Hot Markets</span>
            </div>
            <h2 style={{ fontSize:"clamp(2rem,5vw,3.5rem)", fontWeight:900, color:"#fff", margin:0, fontFamily:"var(--font-space-grotesk,sans-serif)", letterSpacing:"-0.03em", lineHeight:1.1 }}>
              Trending <span className="grad-purple-cyan">Right Now</span>
            </h2>
          </div>
          <Link href="/markets">
            <motion.button whileHover={{scale:1.04}} whileTap={{scale:0.97}}
              style={{ padding:"10px 24px", borderRadius:12, fontWeight:700, fontSize:13, fontFamily:"monospace", color:"#A855F7", background:"rgba(168,85,247,0.08)", border:"1px solid rgba(168,85,247,0.3)", cursor:"pointer", display:"flex", alignItems:"center", gap:6 }}>
              All Markets <ArrowRight size={13} />
            </motion.button>
          </Link>
        </motion.div>

        {ids.length>0 ? (
          <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(310px,1fr))", gap:18 }}>
            {ids.map((id,i) => <MarketCard key={id} marketId={id} index={i} />)}
          </div>
        ) : (
          <div style={{ textAlign:"center", padding:"80px 0", borderRadius:24, border:"1px solid rgba(255,255,255,0.06)", background:"rgba(255,255,255,0.02)" }}>
            <div style={{ fontSize:48, marginBottom:12, opacity:0.4 }}>🔮</div>
            <p style={{ color:"rgba(255,255,255,0.3)", fontFamily:"monospace", fontSize:13 }}>No markets yet.</p>
          </div>
        )}
      </>)}
    </section>
  );
}

/* ═══ HOW IT WORKS ═══════════════════════════════════════════════ */
const STEPS = [
  { num:"01", emoji:"🔗", title:"Connect Wallet", desc:"Link MetaMask or any Web3 wallet. Zero sign-up, zero KYC. Always non-custodial.", from:"#7C3AED", to:"#A855F7" },
  { num:"02", emoji:"🎯", title:"Pick Your Side", desc:"YES or NO on any market. Live odds shift as the crowd bets. The smarter you are, the more you win.", from:"#0891B2", to:"#06B6D4" },
  { num:"03", emoji:"⚡", title:"Win Instantly", desc:"Smart contracts auto-pay the moment a market resolves. No waiting. Pure math, no trust.", from:"#059669", to:"#34D399" },
];

function HowItWorks() {
  return (
    <section style={{ padding:"100px 0", position:"relative", zIndex:1 }}>
      <div style={{ position:"absolute", inset:0, background:"rgba(255,255,255,0.01)", borderTop:"1px solid rgba(255,255,255,0.05)", borderBottom:"1px solid rgba(255,255,255,0.05)" }} />
      {W(<>
        <motion.div initial={{opacity:0,y:24}} whileInView={{opacity:1,y:0}} viewport={{once:true}} transition={{duration:0.7}}
          style={{ textAlign:"center", marginBottom:72 }}>
          <span style={{ fontSize:11, fontFamily:"monospace", letterSpacing:"0.15em", textTransform:"uppercase", color:"#06B6D4", fontWeight:700 }}>Simple Process</span>
          <h2 style={{ fontSize:"clamp(2rem,5vw,3.5rem)", fontWeight:900, color:"#fff", margin:"14px 0 12px", fontFamily:"var(--font-space-grotesk,sans-serif)", letterSpacing:"-0.03em" }}>
            Three Steps to <span className="grad-amber-orange">Win</span>
          </h2>
          <p style={{ fontSize:16, color:"rgba(255,255,255,0.35)", maxWidth:400, margin:"0 auto" }}>No middlemen. No trust. Pure math.</p>
        </motion.div>

        <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(280px,1fr))", gap:24, position:"relative" }}>
          {STEPS.map((s,i) => (
            <motion.div key={i} initial={{opacity:0,y:40}} whileInView={{opacity:1,y:0}} viewport={{once:true}} transition={{duration:0.7, delay:i*0.15, ease:[0.22,1,0.36,1]}}
              whileHover={{y:-8, transition:{duration:0.2}}}
              style={{ padding:32, borderRadius:24, background:`linear-gradient(145deg, rgba(15,10,35,0.8) 0%, rgba(8,8,25,0.9) 100%)`, border:`1px solid rgba(255,255,255,0.07)`, position:"relative", overflow:"hidden", transition:"border-color 0.3s, box-shadow 0.3s" }}
              onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor=`${s.from}50`; (e.currentTarget as HTMLElement).style.boxShadow=`0 20px 60px ${s.from}20`; }}
              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor="rgba(255,255,255,0.07)"; (e.currentTarget as HTMLElement).style.boxShadow="none"; }}>
              {/* Gradient glow corner */}
              <div style={{ position:"absolute", top:-30, right:-30, width:120, height:120, background:`radial-gradient(circle, ${s.from}30, transparent 70%)`, filter:"blur(20px)" }} />
              {/* Step number */}
              <div style={{ position:"absolute", top:16, right:20, fontSize:48, fontWeight:900, fontFamily:"monospace", color:"rgba(255,255,255,0.04)", lineHeight:1 }}>{s.num}</div>

              <div style={{ fontSize:44, marginBottom:20, lineHeight:1, filter:"drop-shadow(0 0 16px rgba(255,255,255,0.2))" }}>{s.emoji}</div>
              <h3 style={{ fontSize:20, fontWeight:800, color:"#fff", margin:"0 0 12px", fontFamily:"var(--font-space-grotesk,sans-serif)" }}>{s.title}</h3>
              <p style={{ fontSize:14, color:"rgba(255,255,255,0.4)", lineHeight:1.7, margin:0 }}>{s.desc}</p>

              {/* Bottom colored bar */}
              <div style={{ position:"absolute", bottom:0, left:0, right:0, height:2, background:`linear-gradient(90deg, ${s.from}, ${s.to})`, opacity:0.7 }} />
            </motion.div>
          ))}
        </div>
      </>)}
    </section>
  );
}

/* ═══ FEATURES BENTO ═════════════════════════════════════════════ */
const FEATS = [
  { Icon:Shield,   title:"100% On-Chain",    desc:"Every bet and payout on Base. Immutable, auditable, forever.", bg:"rgba(124,58,237,0.12)", border:"rgba(124,58,237,0.3)", color:"#A855F7", glow:"#7C3AED" },
  { Icon:Zap,      title:"Instant Payouts",  desc:"Smart contracts auto-distribute winnings the moment a market resolves.", bg:"rgba(234,179,8,0.1)", border:"rgba(234,179,8,0.3)", color:"#FBBF24", glow:"#D97706" },
  { Icon:BarChart3,title:"No House Edge",    desc:"Pari-mutuel math. Winners split the full loser pool. The math never lies.", bg:"rgba(6,182,212,0.1)", border:"rgba(6,182,212,0.3)", color:"#06B6D4", glow:"#0891B2" },
  { Icon:Shield,   title:"Non-Custodial",    desc:"Your USDC stays in your wallet until you bet. We can never touch it.", bg:"rgba(244,63,94,0.1)", border:"rgba(244,63,94,0.3)", color:"#F43F5E", glow:"#E11D48" },
  { Icon:Globe,    title:"Open to All",      desc:"Anyone, anywhere, anytime. A truly open financial prediction protocol.", bg:"rgba(52,211,153,0.1)", border:"rgba(52,211,153,0.3)", color:"#34D399", glow:"#059669" },
  { Icon:Users,    title:"Friend Bets",      desc:"Challenge friends to custom 1v1 bets. You set the terms, judge decides.", bg:"rgba(249,115,22,0.1)", border:"rgba(249,115,22,0.3)", color:"#F97316", glow:"#EA580C" },
];

function Features() {
  return (
    <section style={{ padding:"100px 0", position:"relative", zIndex:1 }}>
      {W(<>
        <motion.div initial={{opacity:0,y:24}} whileInView={{opacity:1,y:0}} viewport={{once:true}} transition={{duration:0.7}}
          style={{ textAlign:"center", marginBottom:64 }}>
          <span style={{ fontSize:11, fontFamily:"monospace", letterSpacing:"0.15em", textTransform:"uppercase", color:"#34D399", fontWeight:700 }}>Why WAGR</span>
          <h2 style={{ fontSize:"clamp(2rem,5vw,3.5rem)", fontWeight:900, color:"#fff", margin:"14px 0 12px", fontFamily:"var(--font-space-grotesk,sans-serif)", letterSpacing:"-0.03em" }}>
            Built <span className="grad-green-cyan">Different</span>
          </h2>
          <p style={{ fontSize:16, color:"rgba(255,255,255,0.35)", maxWidth:400, margin:"0 auto" }}>Every feature designed to eliminate trust and maximize fairness.</p>
        </motion.div>

        <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(300px,1fr))", gap:16 }}>
          {FEATS.map((f,i) => (
            <motion.div key={i} initial={{opacity:0,y:30}} whileInView={{opacity:1,y:0}} viewport={{once:true}} transition={{duration:0.6, delay:i*0.07, ease:[0.22,1,0.36,1]}}
              whileHover={{y:-6,transition:{duration:0.2}}}
              style={{ padding:28, borderRadius:20, background:f.bg, border:`1px solid ${f.border}`, position:"relative", overflow:"hidden", transition:"box-shadow 0.3s, transform 0.2s" }}
              onMouseEnter={e => (e.currentTarget as HTMLElement).style.boxShadow=`0 20px 60px ${f.glow}20`}
              onMouseLeave={e => (e.currentTarget as HTMLElement).style.boxShadow="none"}>
              <div style={{ position:"absolute", top:-20, right:-20, width:80, height:80, background:`radial-gradient(circle,${f.glow}30,transparent 70%)`, filter:"blur(16px)" }} />
              <div style={{ display:"flex", alignItems:"center", gap:14, marginBottom:14 }}>
                <div style={{ width:48, height:48, borderRadius:14, background:`${f.glow}20`, border:`1px solid ${f.border}`, display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}>
                  <f.Icon size={22} color={f.color} style={{ filter:`drop-shadow(0 0 8px ${f.glow}80)` }} />
                </div>
                <h3 style={{ fontSize:16, fontWeight:800, color:"#fff", margin:0, fontFamily:"var(--font-space-grotesk,sans-serif)" }}>{f.title}</h3>
              </div>
              <p style={{ fontSize:13, color:"rgba(255,255,255,0.45)", lineHeight:1.7, margin:0 }}>{f.desc}</p>
            </motion.div>
          ))}
        </div>
      </>)}
    </section>
  );
}

/* ═══ CTA ════════════════════════════════════════════════════════ */
function CTA() {
  return (
    <section style={{ padding:"80px 0 120px", position:"relative", zIndex:1 }}>
      {W(
        <motion.div initial={{opacity:0,y:40}} whileInView={{opacity:1,y:0}} viewport={{once:true}} transition={{duration:0.8, ease:[0.22,1,0.36,1]}}
          style={{ padding:"70px 40px", borderRadius:32, textAlign:"center", position:"relative", overflow:"hidden",
            background:"linear-gradient(135deg, rgba(124,58,237,0.15) 0%, rgba(6,182,212,0.1) 50%, rgba(244,63,94,0.08) 100%)",
            border:"1px solid rgba(168,85,247,0.25)" }}>
          {/* animated background orbs inside CTA */}
          <motion.div animate={{scale:[1,1.4,1],opacity:[0.3,0.6,0.3]}} transition={{duration:6,repeat:Infinity,ease:"easeInOut"}}
            style={{ position:"absolute", top:"50%", left:"20%", transform:"translate(-50%,-50%)", width:300, height:300, background:"radial-gradient(circle,rgba(124,58,237,0.3),transparent 70%)", filter:"blur(40px)" }} />
          <motion.div animate={{scale:[1,1.3,1],opacity:[0.2,0.5,0.2]}} transition={{duration:8,repeat:Infinity,delay:2,ease:"easeInOut"}}
            style={{ position:"absolute", top:"50%", right:"10%", transform:"translate(50%,-50%)", width:250, height:250, background:"radial-gradient(circle,rgba(6,182,212,0.3),transparent 70%)", filter:"blur(40px)" }} />

          <div style={{ position:"relative" }}>
            <motion.div animate={{rotate:[0,15,-15,0]}} transition={{duration:3,repeat:Infinity,ease:"easeInOut"}}
              style={{ fontSize:56, marginBottom:20, display:"inline-block", filter:"drop-shadow(0 0 20px rgba(251,191,36,0.5))" }}>🔮</motion.div>
            <h2 style={{ fontSize:"clamp(2rem,5vw,3.5rem)", fontWeight:900, color:"#fff", margin:"0 0 16px", fontFamily:"var(--font-space-grotesk,sans-serif)", letterSpacing:"-0.03em" }}>
              Ready to predict<br/><span className="grad-amber-red">the future?</span>
            </h2>
            <p style={{ fontSize:17, color:"rgba(255,255,255,0.4)", maxWidth:460, margin:"0 auto 40px", lineHeight:1.7 }}>
              Join WAGR and put money behind your convictions. The smarter you predict, the more you earn.
            </p>
            <div style={{ display:"flex", gap:14, justifyContent:"center", flexWrap:"wrap" }}>
              <Link href="/markets">
                <motion.button whileHover={{scale:1.07,boxShadow:"0 0 80px rgba(168,85,247,0.8)"}} whileTap={{scale:0.96}}
                  style={{ padding:"16px 40px", borderRadius:16, fontWeight:800, fontSize:16, color:"#fff", border:"none", cursor:"pointer",
                    background:"linear-gradient(135deg,#7C3AED,#A855F7,#06B6D4)",
                    boxShadow:"0 0 40px rgba(124,58,237,0.5)",
                    display:"flex", alignItems:"center", gap:10, fontFamily:"var(--font-space-grotesk,sans-serif)" }}>
                  Explore Markets <ArrowRight size={18} />
                </motion.button>
              </Link>
              <Link href="/bet/create">
                <motion.button whileHover={{scale:1.05, borderColor:"rgba(244,63,94,0.6)", color:"#F43F5E"}} whileTap={{scale:0.96}}
                  style={{ padding:"16px 40px", borderRadius:16, fontWeight:700, fontSize:16, color:"rgba(255,255,255,0.6)", background:"rgba(255,255,255,0.04)", border:"1px solid rgba(255,255,255,0.12)", cursor:"pointer", transition:"all 0.25s" }}>
                  Bet a Friend 🤝
                </motion.button>
              </Link>
            </div>
          </div>
        </motion.div>
      )}
    </section>
  );
}

/* ═══ PAGE ═══════════════════════════════════════════════════════ */
export default function Home() {
  return (
    <>
      <Background />
      <Sparks />
      <div style={{ position:"relative", zIndex:1 }}>
        <Hero />
        <LiveTicker />
        <TrendingMarkets />
        <HowItWorks />
        <Features />
        <CTA />
        <Footer />
      </div>
      <style>{`
        @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.4} }
        @media(max-width:768px){
          section { padding-top:60px !important; padding-bottom:60px !important; }
          .hero-title { font-size: clamp(2.5rem, 12vw, 4rem) !important; margin-bottom: 16px !important; }
          .stat-block { padding: 12px 16px !important; }
          .stat-val { font-size: 20px !important; }
          .mobile-btn { padding: 12px 24px !important; font-size: 14px !important; width: 100%; justify-content: center; }
        }
      `}</style>
    </>
  );
}
