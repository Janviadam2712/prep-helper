'use client';
import { useState } from 'react';

type WorkspaceProps = {
  onTranscriptLoaded: (transcript: string) => void;
};

const features = [
  { icon: '⏸️', label: 'Pause & Probe', color: '#A08BFF', bg: 'rgba(123,92,255,0.12)',  border: 'rgba(123,92,255,0.25)' },
  { icon: '🖊️', label: 'Annotate',      color: '#00D4FF', bg: 'rgba(0,212,255,0.09)',   border: 'rgba(0,212,255,0.2)'   },
  { icon: '❓', label: 'Quiz Mode',     color: '#00E5A0', bg: 'rgba(0,229,160,0.09)',   border: 'rgba(0,229,160,0.2)'   },
  { icon: '📊', label: 'Cheat Sheet',   color: '#FFA826', bg: 'rgba(255,168,38,0.09)',  border: 'rgba(255,168,38,0.2)'  },
];

const streakItems = [
  { icon: '⚡', text: 'Physics · 12 concepts' },
  { icon: '🧪', text: 'Chem · 8 quizzes'      },
  { icon: '🏆', text: '7-day streak'           },
];

const badgeMap = {
  idle:    null,
  loading: { bg: 'rgba(255,168,38,0.12)', color: '#FFA826', border: 'rgba(255,168,38,0.3)',  text: '⏳ Fetching…'    },
  done:    { bg: 'rgba(0,229,160,0.12)',  color: '#00E5A0', border: 'rgba(0,229,160,0.3)',   text: '✓ AI Ready'      },
  error:   { bg: 'rgba(255,80,96,0.12)', color: '#FF5060', border: 'rgba(255,80,96,0.3)',   text: '⚠ No transcript' },
};

export default function Workspace({ onTranscriptLoaded }: WorkspaceProps) {
  const [url,     setUrl]     = useState('');
  const [videoId, setVideoId] = useState('');
  const [loading, setLoading] = useState(false);
  const [status,  setStatus]  = useState<'idle' | 'loading' | 'done' | 'error'>('idle');
  const [focused, setFocused] = useState(false);

  const extractVideoId = (input: string) => {
    const match = input.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([a-zA-Z0-9_-]{11})/);
    return match ? match[1] : null;
  };

  const handleLoad = async () => {
    const id = extractVideoId(url);
    if (!id) { alert('Please enter a valid YouTube URL'); return; }
    setLoading(true); setVideoId(id); setStatus('loading');
    try {
      const res  = await fetch(`/api/transcript?videoId=${id}`);
      const data = await res.json();
      if (data.transcript) { onTranscriptLoaded(data.transcript); setStatus('done'); }
      else { setStatus('error'); }
    } catch { setStatus('error'); }
    finally   { setLoading(false); }
  };

  const badge = status !== 'idle' ? badgeMap[status] : null;

  return (
    <main className="flex-1 flex flex-col h-full overflow-hidden" style={{ padding: '12px', gap: '10px', backgroundColor: 'var(--bg)' }}>

      {/* ── URL Bar ── */}
      <div
        className="flex items-center gap-2 shrink-0"
        style={{
          backgroundColor: 'var(--card)',
          border: `1px solid ${focused ? 'rgba(123,92,255,0.5)' : 'var(--border-s)'}`,
          borderRadius: '14px',
          boxShadow: focused ? '0 0 0 3px rgba(123,92,255,0.10)' : 'none',
          padding: '8px 8px 8px 14px',
          transition: 'border-color 0.18s ease, box-shadow 0.18s ease',
        }}
      >
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" style={{ color: 'var(--t3)', flexShrink: 0 }}>
          <path d="M10 13a5 5 0 007.54.54l3-3a5 5 0 00-7.07-7.07l-1.72 1.71" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          <path d="M14 11a5 5 0 00-7.54-.54l-3 3a5 5 0 007.07 7.07l1.71-1.71" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
        <input
          type="text" value={url}
          onChange={(e) => setUrl(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleLoad()}
          onFocus={() => setFocused(true)} onBlur={() => setFocused(false)}
          placeholder="Drop any YouTube lecture here and press Enter…"
          style={{ flex: 1, border: 'none', outline: 'none', background: 'transparent', fontSize: '13.5px', color: 'var(--t1)', minWidth: 0, letterSpacing: '-0.01em' }}
        />
        {badge && (
          <span style={{ backgroundColor: badge.bg, color: badge.color, border: `1px solid ${badge.border}`, borderRadius: '99px', padding: '3px 10px', fontSize: '11.5px', fontWeight: 600, flexShrink: 0, whiteSpace: 'nowrap' }}>
            {badge.text}
          </span>
        )}
        <button
          onClick={handleLoad} disabled={loading || !url.trim()}
          className="btn-primary disabled:opacity-40 disabled:cursor-not-allowed disabled:transform-none"
          style={{ borderRadius: '10px', padding: '7px 16px', fontSize: '13px' }}
        >
          {loading ? '…' : 'Load →'}
        </button>
      </div>

      {/* ── Video Area ── */}
      <div
        className="flex-1 rounded-2xl overflow-hidden relative flex items-center justify-center"
        style={{ backgroundColor: 'var(--card)', border: '1px solid var(--border)', boxShadow: videoId ? 'var(--shadow-lg)' : 'none' }}
      >
        {/* Ambient glow */}
        {!videoId && <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(ellipse 60% 40% at 50% 50%, rgba(123,92,255,0.06), transparent)', pointerEvents: 'none' }} />}

        {videoId ? (
          <>
            <iframe
              src={`https://www.youtube.com/embed/${videoId}?enablejsapi=1&rel=0&modestbranding=1`}
              className="absolute inset-0 w-full h-full" allowFullScreen
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            />
            <div
              className="absolute bottom-4 left-1/2 -translate-x-1/2 z-10 flex items-center gap-3"
              style={{ padding: '8px 18px', borderRadius: '99px', backgroundColor: 'rgba(14,13,34,0.88)', backdropFilter: 'blur(16px)', border: '1px solid var(--border-s)', boxShadow: '0 4px 24px rgba(0,0,0,0.4)' }}
            >
              <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--t2)' }}>🖊️ Pen</span>
              <span style={{ width: '1px', height: '14px', backgroundColor: 'var(--border-s)' }} />
              <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--t2)' }}>🖍️ Highlight</span>
              <span style={{ width: '1px', height: '14px', backgroundColor: 'var(--border-s)' }} />
              <span style={{ fontSize: '12px', fontWeight: 700, color: 'var(--violet)' }}>✨ Pause &amp; Probe: Day 5</span>
            </div>
          </>
        ) : (
          <div className="animate-fade-in flex flex-col items-center text-center px-8 py-8 space-y-5 relative z-10" style={{ maxWidth: '400px' }}>
            {/* Badge */}
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: '7px', padding: '5px 14px', background: 'rgba(123,92,255,0.12)', border: '1px solid rgba(123,92,255,0.25)', borderRadius: '99px' }}>
              <span className="animate-pulse-dot inline-block rounded-full" style={{ width: '5px', height: '5px', backgroundColor: 'var(--violet)' }} />
              <span style={{ fontSize: '10px', fontWeight: 700, color: '#A08BFF', letterSpacing: '0.06em', textTransform: 'uppercase' }}>AI Ready to Watch</span>
            </div>

            {/* Icon with pulse ring */}
            <div style={{ position: 'relative', width: '96px', height: '96px' }}>
              <div style={{ position: 'absolute', inset: '-6px', borderRadius: '30px', border: '1.5px solid rgba(123,92,255,0.18)', animation: 'pulseRing 2.5s ease-in-out infinite' }} />
              <div style={{ width: '96px', height: '96px', borderRadius: '24px', background: 'var(--raised)', border: '1px solid rgba(123,92,255,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '40px' }}>🎬</div>
            </div>

            {/* Copy */}
            <div>
              <p style={{ fontSize: '22px', fontWeight: 700, letterSpacing: '-0.04em', lineHeight: 1.2, marginBottom: '10px' }}>
                Your next{' '}
                <span className="gradient-text">breakthrough</span>
                <br />is one lecture away
              </p>
              <p style={{ fontSize: '13.5px', color: 'var(--t2)', lineHeight: 1.7, fontWeight: 500 }}>
                Paste any YouTube URL above. The AI watches it with you — and pauses at the{' '}
                <strong style={{ color: 'var(--t1)', fontWeight: 600 }}>exact moment</strong>{' '}
                a concept matters to quiz you.
              </p>
            </div>

            {/* Pills */}
            <div className="flex flex-wrap gap-2 justify-center">
              {features.map((f) => (
                <span key={f.label} style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '7px 13px', borderRadius: '99px', fontSize: '12px', fontWeight: 600, backgroundColor: f.bg, color: f.color, border: `1px solid ${f.border}` }}>
                  {f.icon} {f.label}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Streak strip */}
        {!videoId && (
          <div className="absolute bottom-0 left-0 right-0 flex items-center gap-3" style={{ padding: '10px 20px', background: 'rgba(14,13,34,0.85)', backdropFilter: 'blur(8px)', borderTop: '1px solid var(--border)' }}>
            <span style={{ fontSize: '9.5px', fontWeight: 700, color: 'var(--t3)', letterSpacing: '0.08em', textTransform: 'uppercase', whiteSpace: 'nowrap' }}>🔥 Today</span>
            <div className="flex gap-2 overflow-hidden">
              {streakItems.map((item) => (
                <span key={item.text} style={{ display: 'flex', alignItems: 'center', gap: '5px', padding: '4px 10px', borderRadius: '99px', fontSize: '11px', fontWeight: 600, backgroundColor: 'var(--raised)', border: '1px solid var(--border-s)', color: 'var(--t2)', whiteSpace: 'nowrap' }}>
                  {item.icon} {item.text}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>
    </main>
  );
}