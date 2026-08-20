'use client';
import { useState, useEffect, useRef } from 'react';
import { useYouTubePlayer } from '../hooks/useTimestamp';
import PauseProbeModal from './PauseProbeModal';
import type { ConceptCheckpoint } from '../app/api/analyze/route';
import type { TranscriptSegment } from '../app/api/transcript/route';

type WorkspaceProps = {
  onTranscriptLoaded: (transcript: string) => void;
  onSegmentsLoaded?: (segments: TranscriptSegment[]) => void;
};

const features = [
  { icon: '⏸️', label: 'Pause & Probe', color: '#A08BFF', bg: 'rgba(108,71,255,0.12)',  border: 'rgba(108,71,255,0.25)' },
  { icon: '🖊️', label: 'Annotate',      color: '#F0A500', bg: 'rgba(240,165,0,0.09)',   border: 'rgba(240,165,0,0.2)'   },
  { icon: '❓', label: 'Quiz Mode',     color: '#00E5A0', bg: 'rgba(0,229,160,0.09)',   border: 'rgba(0,229,160,0.2)'   },
  { icon: '📊', label: 'Cheat Sheet',   color: '#FFA826', bg: 'rgba(255,168,38,0.09)',  border: 'rgba(255,168,38,0.2)'  },
];

const streakItems = [
  { icon: '⚡', text: 'Physics · 12 concepts' },
  { icon: '🧪', text: 'Chem · 8 quizzes'      },
  { icon: '🏆', text: '7-day streak'           },
];
// NOTE: streakItems/features still hardcoded/decorative — kept as-is per
// explicit instruction to leave streak-related items for later.

const badgeMap = {
  idle:      null,
  loading:   { bg: 'rgba(255,168,38,0.12)', color: '#FFA826', border: 'rgba(255,168,38,0.3)',  text: '⏳ Fetching…'    },
  analyzing: { bg: 'rgba(108,71,255,0.12)', color: '#A08BFF', border: 'rgba(108,71,255,0.3)',  text: '🔍 Checking content…' },
  done:      { bg: 'rgba(0,229,160,0.12)',  color: '#00E5A0', border: 'rgba(0,229,160,0.3)',   text: '✓ AI Ready'      },
  error:     { bg: 'rgba(255,80,96,0.12)', color: '#FF5060', border: 'rgba(255,80,96,0.3)',   text: '⚠ No transcript' },
  rejected:  { bg: 'rgba(255,80,96,0.12)', color: '#FF5060', border: 'rgba(255,80,96,0.3)',   text: '🚫 Not educational' },
  failed:    { bg: 'rgba(255,80,96,0.12)', color: '#FF5060', border: 'rgba(255,80,96,0.3)',   text: '⚠ Could not generate questions' },
};

export default function Workspace({ onTranscriptLoaded, onSegmentsLoaded }: WorkspaceProps) {
  const [url,     setUrl]     = useState('');
  const [videoId,        setVideoId]        = useState('');
  const [pendingVideoId, setPendingVideoId]  = useState('');
  const [loading, setLoading] = useState(false);
  const [status,  setStatus]  = useState<'idle' | 'loading' | 'analyzing' | 'done' | 'error' | 'rejected' | 'failed'>('idle');
  const [rejectMessage, setRejectMessage] = useState('');
  const [failMessage,   setFailMessage]   = useState('');
  const [focused, setFocused] = useState(false);
  const [segments, setSegments] = useState<TranscriptSegment[]>([]);
  const [checkpoints, setCheckpoints] = useState<ConceptCheckpoint[]>([]);
  const [activeCheckpoint, setActiveCheckpoint] = useState<ConceptCheckpoint | null>(null);
  const triggeredStarts = useRef<Set<number>>(new Set());
  const { containerRef, isReady, currentTime, playerState, pause, play } = useYouTubePlayer(videoId);

  const [showPareto, setShowPareto] = useState(false);

  useEffect(() => {
    const handleShowPareto = () => setShowPareto((prev) => !prev);
    window.addEventListener('show-pareto', handleShowPareto);
    return () => window.removeEventListener('show-pareto', handleShowPareto);
  }, []);

  const extractVideoId = (input: string): string | null => {
    const match = input.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([a-zA-Z0-9_-]{11})/);
    return match ? match[1] : null;
  };

  const handleLoad = async () => {
    const id = extractVideoId(url);
    if (!id) { alert('Please enter a valid YouTube URL'); return; }

    // BUG FIX: AIChatPanel's conversation history was never cleared when a
    // new video loaded — every message from every previously-tested video
    // in this session kept accumulating and got re-sent to Groq on every
    // new message, regardless of which video was currently active. This is
    // what was actually burning through the rate limit after just 1-2
    // messages, even on short videos — it was never really about any single
    // video's length, it was the ever-growing, never-reset chat history.
    // Same custom-event pattern as subjects-updated/session-complete: no
    // direct prop link between these sibling components, so an event is
    // the simplest way to signal "a new video started, reset the chat."
    window.dispatchEvent(new CustomEvent('video-changed'));

    setLoading(true);
    setVideoId('');
    setPendingVideoId(id);
    setStatus('loading');
    setRejectMessage('');
    setFailMessage('');
    setCheckpoints([]);
    setActiveCheckpoint(null);
    triggeredStarts.current = new Set();
    try {
      const res  = await fetch(`/api/transcript?videoId=${id}`);
      const data = await res.json();
      if (data.transcript && data.segments && data.segments.length > 0) {
        onTranscriptLoaded(data.transcript);
        setSegments(data.segments);
        onSegmentsLoaded?.(data.segments);
        setStatus('analyzing');

        try {
          const analyzeRes = await fetch('/api/analyze', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ segments: data.segments, videoId: id }),
          });
          const body = await analyzeRes.json();

          if (!analyzeRes.ok && body.error === 'NOT_EDUCATIONAL') {
            setStatus('rejected');
            setRejectMessage(body.message);
            setPendingVideoId('');
            return;
          }

          if (!analyzeRes.ok || !body.checkpoints || body.checkpoints.length === 0) {
            setStatus('failed');
            setFailMessage(
              body.message ||
              "We couldn't generate questions for this video — its captions may be missing proper timing data. Try a different lecture."
            );
            setPendingVideoId('');
            return;
          }

          setCheckpoints(body.checkpoints);
          if (body.subject) {
            window.dispatchEvent(new CustomEvent('subjects-updated'));
          }

          setVideoId(id);
          setStatus('done');
        } catch {
          setStatus('failed');
          setFailMessage("We couldn't reach the AI to analyze this video. Check your connection and try again.");
          setPendingVideoId('');
        }
      }
      else { setStatus('error'); }
    } catch { setStatus('error'); }
    finally   { setLoading(false); }
  };

  const badge = status !== 'idle' ? badgeMap[status] : null;

  useEffect(() => {
    if (!isReady || activeCheckpoint || playerState !== 'playing') return;
    const next = checkpoints.find(
      (cp) => currentTime >= cp.start && !triggeredStarts.current.has(cp.start)
    );
    if (next) {
      triggeredStarts.current.add(next.start);
      pause();
      setActiveCheckpoint(next);
    }
  }, [currentTime, checkpoints, isReady, playerState, activeCheckpoint, pause]);

  const handleResume = (answeredCheckpoint?: { start: number }) => {
    setActiveCheckpoint(null);
    if (answeredCheckpoint && checkpoints.length > 0) {
      const remaining = checkpoints.filter(
        (cp) => !triggeredStarts.current.has(cp.start) || cp.start === answeredCheckpoint.start
      );
      const isLast = remaining.every((cp) => triggeredStarts.current.has(cp.start));
      if (isLast) {
        window.dispatchEvent(new CustomEvent('session-complete', { detail: { checkpoints } }));
      }
    }
    play();
  };

  const showPlayer = status === 'done' && Boolean(videoId);

  return (
    <main className="flex-1 flex flex-col h-full overflow-hidden" style={{ padding: '20px', gap: '16px', backgroundColor: 'var(--background)' }}>

      {/* ── URL Bar ── */}
      <div
        className="flex items-center gap-2 shrink-0"
        style={{
          backgroundColor: 'var(--panel-bg)',
          border: `1px solid ${focused ? 'rgba(108,71,255,0.5)' : 'var(--border)'}`,
          borderRadius: '14px',
          boxShadow: focused ? '0 0 0 3px rgba(108,71,255,0.10)' : 'none',
          padding: '10px 10px 10px 16px',
          transition: 'border-color 0.18s ease, box-shadow 0.18s ease',
        }}
      >
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" style={{ color: 'var(--text-faint)', flexShrink: 0 }}>
          <path d="M10 13a5 5 0 007.54.54l3-3a5 5 0 00-7.07-7.07l-1.72 1.71" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          <path d="M14 11a5 5 0 00-7.54-.54l-3 3a5 5 0 007.07 7.07l1.71-1.71" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
        <input
          type="text" value={url}
          onChange={(e) => setUrl(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleLoad()}
          onFocus={() => setFocused(true)} onBlur={() => setFocused(false)}
          placeholder="Drop any YouTube lecture here and press Enter…"
          style={{ flex: 1, border: 'none', outline: 'none', background: 'transparent', fontSize: '13.5px', color: 'var(--text-main)', minWidth: 0, letterSpacing: '-0.01em' }}
        />
        {badge && (
          <span style={{ backgroundColor: badge.bg, color: badge.color, border: `1px solid ${badge.border}`, borderRadius: '99px', padding: '3px 10px', fontSize: '11.5px', fontWeight: 600, flexShrink: 0, whiteSpace: 'nowrap' }}>
            {badge.text}
          </span>
        )}
        <button
          onClick={handleLoad} disabled={loading || !url.trim()}
          className="btn-primary disabled:opacity-40 disabled:cursor-not-allowed disabled:transform-none"
          style={{ borderRadius: '10px', padding: '8px 18px', fontSize: '13px' }}
        >
          {loading ? '…' : 'Load →'}
        </button>
      </div>

      {/* ── Video Area ──
          STRUCTURAL FIX: the container div (YouTube's mount point) is now
          the ONLY element that is unconditionally, permanently mounted as a
          direct child here. Everything else — ambient glow, analyzing/
          rejected/failed screens, the player's own overlays, the empty
          idle state, the streak strip — lives inside ONE single wrapper
          div that is ALSO always mounted. Only the CONTENT inside that
          wrapper changes conditionally.
          
          Why this matters: previously several of these were separate
          top-level siblings, each individually conditionally mounted
          ({!showPlayer && <div>}, {status === 'x' ? <div> : ...}). Every
          time status changed, React had to insert/remove a sibling
          directly next to the YouTube-controlled container div — and
          YouTube's IFrame API mutates that div's internals outside React's
          knowledge, so React's insertBefore/removeChild calls periodically
          referenced DOM nodes that no longer matched what YouTube had left
          behind. Crashed as "removeChild" once, "insertBefore" another
          time — same root cause, different symptom, because ANY sibling
          near the container was at risk, not just one specific div.
          
          Fix: container div's sibling COUNT and ORDER never changes now.
          There is exactly one wrapper, always mounted, always in the same
          position. React only ever reconciles content INSIDE that wrapper,
          which has nothing to do with the container div's own position. ── */}
      <div
        className="flex-1 rounded-2xl overflow-hidden relative flex items-center justify-center"
        style={{ backgroundColor: 'var(--panel-bg)', border: '1px solid var(--border)', boxShadow: showPlayer ? 'var(--shadow-lg)' : 'none' }}
      >
        {/* Player container — always mounted, always first, always the
            same single sibling position. Hidden visually via display:none
            when unused, never unmounted. */}
        <div
          ref={containerRef}
          className="absolute inset-0 w-full h-full"
          style={{ display: showPlayer ? 'block' : 'none' }}
        />

        {/* Single always-mounted wrapper for everything else. pointer-events-none
            on BOTH levels here is critical — this wrapper sits directly on top
            of the YouTube iframe. If it captured clicks across its full w-full
            h-full area, YouTube's own play button would become unclickable
            (this was a real regression caught in testing: the transparent
            space around small UI elements was swallowing all clicks meant for
            the iframe underneath). Only the specific interactive pieces below
            re-enable pointer-events individually. */}
        <div className="absolute inset-0 w-full h-full flex items-center justify-center pointer-events-none">
          <div className="w-full h-full flex items-center justify-center relative pointer-events-none">

            {!showPlayer && (
              <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(ellipse 60% 40% at 50% 50%, rgba(108,71,255,0.06), transparent)', pointerEvents: 'none' }} />
            )}

            {status === 'analyzing' && pendingVideoId ? (
              <div className="flex flex-col items-center text-center px-8 space-y-4 relative z-10 pointer-events-auto">
                <div className="animate-pulse-dot inline-block rounded-full" style={{ width: '10px', height: '10px', backgroundColor: '#A08BFF' }} />
                <p style={{ fontSize: '15px', fontWeight: 600, color: 'var(--text-main)' }}>Preparing your questions…</p>
                <p style={{ fontSize: '12.5px', color: 'var(--text-muted)', maxWidth: '320px', lineHeight: 1.6 }}>
                  Reading through the lecture and writing checkpoint questions just for this video. Usually takes 10–15 seconds.
                </p>
              </div>
            ) : status === 'rejected' ? (
              <div className="flex flex-col items-center text-center px-8 space-y-4 relative z-10 pointer-events-auto" style={{ maxWidth: '380px' }}>
                <div style={{ width: '64px', height: '64px', borderRadius: '20px', backgroundColor: 'rgba(255,80,96,0.1)', border: '1px solid rgba(255,80,96,0.25)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '28px' }}>🚫</div>
                <p style={{ fontSize: '15px', fontWeight: 700, color: 'var(--text-main)' }}>Not exam-prep content</p>
                <p style={{ fontSize: '12.5px', color: 'var(--text-muted)', lineHeight: 1.6 }}>{rejectMessage}</p>
              </div>
            ) : status === 'failed' ? (
              <div className="flex flex-col items-center text-center px-8 space-y-4 relative z-10 pointer-events-auto" style={{ maxWidth: '380px' }}>
                <div style={{ width: '64px', height: '64px', borderRadius: '20px', backgroundColor: 'rgba(255,80,96,0.1)', border: '1px solid rgba(255,80,96,0.25)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '28px' }}>⚠️</div>
                <p style={{ fontSize: '15px', fontWeight: 700, color: 'var(--text-main)' }}>Couldn't generate questions</p>
                <p style={{ fontSize: '12.5px', color: 'var(--text-muted)', lineHeight: 1.6 }}>{failMessage}</p>
              </div>
            ) : showPlayer ? (
              <>
                {activeCheckpoint && (
                  <div className="pointer-events-auto absolute inset-0">
                    <PauseProbeModal checkpoint={activeCheckpoint} onResume={() => handleResume(activeCheckpoint)} />
                  </div>
                )}
                {showPareto && (
                  <div
                    className="absolute inset-x-0 bottom-0 z-20 pointer-events-auto"
                    style={{
                      background: 'rgba(14,13,34,0.97)',
                      backdropFilter: 'blur(20px)',
                      borderTop: '1px solid rgba(108,71,255,0.3)',
                      borderRadius: '16px 16px 0 0',
                      padding: '16px 20px 20px',
                      maxHeight: '60%',
                      overflowY: 'auto',
                      animation: 'slideUp 0.22s ease-out',
                    }}
                  >
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <span style={{ fontSize: '16px' }}>⚡</span>
                        <p style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-main)', letterSpacing: '-0.02em' }}>
                          80-20 — The Vital 20%
                        </p>
                      </div>
                      <button
                        onClick={() => setShowPareto(false)}
                        style={{ fontSize: '11px', color: 'var(--text-faint)', background: 'none', border: 'none', cursor: 'pointer', padding: '2px 8px', borderRadius: '6px', backgroundColor: 'var(--surface-raised)' }}
                      >
                        Close
                      </button>
                    </div>

                    {checkpoints.length === 0 ? (
                      <p style={{ fontSize: '12px', color: 'var(--text-faint)', lineHeight: 1.6 }}>
                        No concepts yet — load a lecture first and let the AI analyze it.
                      </p>
                    ) : (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        {checkpoints.map((cp) => {
                          const mins = Math.floor(cp.start / 60);
                          const secs = Math.floor(cp.start % 60).toString().padStart(2, '0');
                          return (
                            <div
                              key={cp.start}
                              style={{
                                display: 'flex',
                                alignItems: 'flex-start',
                                gap: '10px',
                                padding: '9px 12px',
                                borderRadius: '10px',
                                backgroundColor: 'rgba(108,71,255,0.08)',
                                border: '1px solid rgba(108,71,255,0.15)',
                              }}
                            >
                              <span style={{ fontSize: '11px', fontWeight: 700, color: '#6C47FF', whiteSpace: 'nowrap', marginTop: '1px', minWidth: '36px' }}>
                                {mins}:{secs}
                              </span>
                              <p style={{ fontSize: '12px', color: 'var(--text-muted)', lineHeight: 1.5, fontWeight: 500 }}>
                                {cp.question}
                              </p>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}
                <div
                  className="absolute bottom-4 left-1/2 -translate-x-1/2 z-10 flex items-center gap-3 pointer-events-auto"
                  style={{ padding: '8px 18px', borderRadius: '99px', backgroundColor: 'rgba(14,13,34,0.88)', backdropFilter: 'blur(16px)', border: '1px solid var(--border)', boxShadow: '0 4px 24px rgba(0,0,0,0.4)' }}
                >
                  <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-muted)' }}>🖊️ Pen</span>
                  <span style={{ width: '1px', height: '14px', backgroundColor: 'var(--border)' }} />
                  <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-muted)' }}>🖍️ Highlight</span>
                </div>
              </>
            ) : (
              <div className="animate-fade-in flex flex-col items-center text-center px-8 py-10 space-y-6 relative z-10 pointer-events-auto" style={{ maxWidth: '420px' }}>
                <div style={{ display: 'inline-flex', alignItems: 'center', gap: '7px', padding: '6px 16px', background: 'rgba(108,71,255,0.12)', border: '1px solid rgba(108,71,255,0.25)', borderRadius: '99px' }}>
                  <span className="animate-pulse-dot inline-block rounded-full" style={{ width: '5px', height: '5px', backgroundColor: '#6C47FF' }} />
                  <span style={{ fontSize: '10px', fontWeight: 700, color: '#A08BFF', letterSpacing: '0.06em', textTransform: 'uppercase' }}>AI Ready to Watch</span>
                </div>

                <div style={{ position: 'relative', width: '100px', height: '100px' }}>
                  <div style={{ position: 'absolute', inset: '-6px', borderRadius: '30px', border: '1.5px solid rgba(108,71,255,0.18)', animation: 'pulseRing 2.5s ease-in-out infinite' }} />
                  <div style={{ width: '100px', height: '100px', borderRadius: '24px', backgroundColor: 'var(--surface-raised)', border: '1px solid rgba(108,71,255,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '42px' }}>🎬</div>
                </div>

                <div>
                  <p style={{ fontSize: '23px', fontWeight: 700, letterSpacing: '-0.04em', lineHeight: 1.2, marginBottom: '12px', color: 'var(--text-main)' }}>
                    Your next{' '}
                    <span className="brand-gradient-text">breakthrough</span>
                    <br />is one lecture away
                  </p>
                  <p style={{ fontSize: '13.5px', color: 'var(--text-muted)', lineHeight: 1.7, fontWeight: 500 }}>
                    Paste any YouTube URL above. The AI watches it with you — and pauses at the{' '}
                    <strong style={{ color: 'var(--text-main)', fontWeight: 600 }}>exact moment</strong>{' '}
                    a concept matters to quiz you.
                  </p>
                </div>

                <div className="flex flex-wrap gap-2 justify-center">
                  {features.map((f) => (
                    <span key={f.label} style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '7px 14px', borderRadius: '99px', fontSize: '12px', fontWeight: 600, backgroundColor: f.bg, color: f.color, border: `1px solid ${f.border}` }}>
                      {f.icon} {f.label}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {!showPlayer && status !== 'analyzing' && status !== 'rejected' && status !== 'failed' && (
              <div className="absolute bottom-0 left-0 right-0 flex items-center gap-3 pointer-events-auto" style={{ padding: '12px 24px', background: 'rgba(14,13,34,0.85)', backdropFilter: 'blur(8px)', borderTop: '1px solid var(--border)' }}>
                <span style={{ fontSize: '9.5px', fontWeight: 700, color: 'var(--text-faint)', letterSpacing: '0.08em', textTransform: 'uppercase', whiteSpace: 'nowrap' }}>🔥 Today</span>
                <div className="flex gap-2 overflow-hidden">
                  {streakItems.map((item) => (
                    <span key={item.text} style={{ display: 'flex', alignItems: 'center', gap: '5px', padding: '4px 10px', borderRadius: '99px', fontSize: '11px', fontWeight: 600, backgroundColor: 'var(--surface-raised)', border: '1px solid var(--border)', color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>
                      {item.icon} {item.text}
                    </span>
                  ))}
                </div>
              </div>
            )}

          </div>
        </div>
      </div>
    </main>
  );
}