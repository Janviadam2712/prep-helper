'use client';
import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

const messages = [
  "You don't need expensive coaching.\nYou need the right method.",
  "Deep understanding beats memorisation — every time.",
  "The system may be broken.\nYour preparation does not have to be.",
  "One concept truly understood beats\n10 surface-level revisions.",
  "You are exactly where you need to be.\nKeep going.",
  "Toppers are not born.\nThey are students who kept showing up.",
];

const stats = [
  { value: 2400,  suffix: '+', label: 'Students learning' },
  { value: 48000, suffix: '+', label: 'Concepts mastered' },
  { value: 94,    suffix: '%', label: 'Quiz accuracy avg' },
];

function CountUp({ target, suffix }: { target: number; suffix: string }) {
  const [count, setCount] = useState(0);
  useEffect(() => {
    const duration = 1800, steps = 60, step = target / steps;
    let current = 0;
    const timer = setInterval(() => {
      current += step;
      if (current >= target) { setCount(target); clearInterval(timer); }
      else setCount(Math.floor(current));
    }, duration / steps);
    return () => clearInterval(timer);
  }, [target]);
  return <>{count.toLocaleString()}{suffix}</>;
}

export default function WelcomePage() {
  const [msgIndex, setMsgIndex] = useState(0);
  const [progress, setProgress] = useState(0);
  const [userName, setUserName] = useState('');
  const router = useRouter();
  const supabase = createClient();

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      const name = data.user?.user_metadata?.full_name ?? data.user?.email?.split('@')[0] ?? 'Explorer';
      setUserName(name.split(' ')[0]);
    });
  }, []);

  useEffect(() => {
    const t = setInterval(() => setMsgIndex(i => (i + 1) % messages.length), 3000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    const start = Date.now(), total = 8000;
    const t = setInterval(() => {
      const pct = Math.min(((Date.now() - start) / total) * 100, 100);
      setProgress(pct);
      if (pct >= 100) { clearInterval(t); router.push('/dashboard'); }
    }, 50);
    return () => clearInterval(t);
  }, [router]);

  return (
    <div style={{ minHeight: '100vh', background: '#07071A', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '24px', fontFamily: 'var(--font-sg), Space Grotesk, system-ui, sans-serif', position: 'relative', overflow: 'hidden' }}>
      <div style={{ position: 'absolute', top: '20%', left: '50%', transform: 'translateX(-50%)', width: '600px', height: '400px', background: 'radial-gradient(ellipse, rgba(108,71,255,0.12) 0%, transparent 70%)', pointerEvents: 'none' }} />
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '32px', maxWidth: '480px', width: '100%', position: 'relative', zIndex: 1 }}>

        <motion.div initial={{ y: -40, opacity: 0, scale: 0.8 }} animate={{ y: 0, opacity: 1, scale: 1 }} transition={{ type: 'spring', stiffness: 300, damping: 20, delay: 0.1 }}
          style={{ width: '56px', height: '56px', borderRadius: '16px', background: 'linear-gradient(135deg, #6C47FF, #F0A500)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: 800, fontSize: '22px', boxShadow: '0 8px 32px rgba(108,71,255,0.4)' }}>P</motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.3 }} style={{ textAlign: 'center' }}>
          <p style={{ fontSize: '13px', fontWeight: 600, color: '#453F60', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: '8px' }}>Welcome back</p>
          <h1 style={{ fontSize: '32px', fontWeight: 700, color: '#F5F0FF', letterSpacing: '-0.04em', lineHeight: 1.1 }}>{userName || '...'}</h1>
        </motion.div>

        <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.5, delay: 0.5 }}
          style={{ width: '100%', background: '#0E0D22', border: '1px solid rgba(255,255,255,0.07)', borderLeft: '3px solid #6C47FF', borderRadius: '14px', padding: '20px 22px', minHeight: '90px', display: 'flex', alignItems: 'center' }}>
          <AnimatePresence mode="wait">
            <motion.p key={msgIndex} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -12 }} transition={{ duration: 0.4 }}
              style={{ fontSize: '15px', fontWeight: 600, color: '#F5F0FF', lineHeight: 1.6, whiteSpace: 'pre-line', margin: 0 }}>
              {messages[msgIndex]}
            </motion.p>
          </AnimatePresence>
        </motion.div>

        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.7 }} style={{ display: 'flex', gap: '6px' }}>
          {messages.map((_, i) => (
            <div key={i} style={{ width: i === msgIndex ? '20px' : '6px', height: '6px', borderRadius: '99px', background: i === msgIndex ? '#6C47FF' : 'rgba(255,255,255,0.1)', transition: 'all 0.3s ease' }} />
          ))}
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.9 }}
          style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '10px', width: '100%' }}>
          {stats.map((stat) => (
            <div key={stat.label} style={{ background: '#0E0D22', border: '1px solid rgba(255,255,255,0.07)', borderRadius: '12px', padding: '14px 10px', textAlign: 'center' }}>
              <p style={{ fontSize: '20px', fontWeight: 700, letterSpacing: '-0.03em', background: 'linear-gradient(135deg, #6C47FF, #F0A500)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', margin: 0, marginBottom: '4px' }}>
                <CountUp target={stat.value} suffix={stat.suffix} />
              </p>
              <p style={{ fontSize: '10px', fontWeight: 600, color: '#453F60', textTransform: 'uppercase', letterSpacing: '0.05em', margin: 0 }}>{stat.label}</p>
            </div>
          ))}
        </motion.div>

        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1.1 }} style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <div style={{ height: '3px', background: 'rgba(255,255,255,0.07)', borderRadius: '99px', overflow: 'hidden' }}>
            <motion.div style={{ height: '100%', borderRadius: '99px', background: 'linear-gradient(90deg, #6C47FF, #F0A500)', width: `${progress}%` }} />
          </div>
          <motion.button onClick={() => router.push('/dashboard')} whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
            style={{ width: '100%', padding: '14px', background: 'linear-gradient(135deg, #6C47FF, #F0A500)', color: 'white', border: 'none', borderRadius: '12px', fontFamily: 'inherit', fontWeight: 700, fontSize: '15px', cursor: 'pointer', letterSpacing: '-0.01em', boxShadow: '0 4px 20px rgba(108,71,255,0.35)' }}>
            Start today's lecture →
          </motion.button>
          <p style={{ textAlign: 'center', fontSize: '11px', color: '#453F60', fontWeight: 500 }}>Auto-continuing in a moment…</p>
        </motion.div>
      </div>
    </div>
  );
}