'use client';
import { useState } from 'react';

type SidebarProps = {
  open: boolean;
  onToggle: () => void;
  activeSubject: string;
  onSubjectChange: (subject: string) => void;
};

const subjects = [
  { icon: '⚡', name: 'Physics',     tag: 'JEE Advanced', progress: 68, color: '#FFA826', bg: 'rgba(255,168,38,0.10)',  border: 'rgba(255,168,38,0.22)' },
  { icon: '🧪', name: 'Chemistry',   tag: 'Boards + JEE', progress: 45, color: '#00E5A0', bg: 'rgba(0,229,160,0.08)',   border: 'rgba(0,229,160,0.18)'  },
  { icon: '📐', name: 'Mathematics', tag: 'JEE Advanced', progress: 52, color: '#FF5060', bg: 'rgba(255,80,96,0.08)',   border: 'rgba(255,80,96,0.18)'  },
  { icon: '🧬', name: 'Biology',     tag: 'NEET',         progress: 30, color: '#8FFF5A', bg: 'rgba(143,255,90,0.07)', border: 'rgba(143,255,90,0.16)' },
];

const recentSessions = [
  { title: 'Laws of Motion',    subject: 'Physics',   time: '2h ago',    icon: '⚡' },
  { title: 'Organic Chemistry', subject: 'Chemistry', time: 'Yesterday', icon: '🧪' },
];

const streakDays = 7;
const totalDays  = 14;

export default function Sidebar({ open, onToggle, activeSubject, onSubjectChange }: SidebarProps) {
  const [hovered, setHovered] = useState<string | null>(null);

  return (
    <aside
      className="flex flex-col h-full shrink-0 transition-all duration-300 relative z-20"
      style={{ width: open ? 'var(--sidebar-open)' : 'var(--sidebar-closed)', backgroundColor: 'var(--card)', borderRight: '1px solid var(--border)' }}
    >
      {/* ── Header ── */}
      <div className="flex items-center h-14 shrink-0" style={{ padding: open ? '0 12px' : '0 10px', borderBottom: '1px solid var(--border)' }}>
        {open ? (
          <>
            <div className="flex items-center gap-2.5 flex-1 min-w-0">
              <div className="gradient-bg flex items-center justify-center text-white font-bold shrink-0" style={{ width: '30px', height: '30px', borderRadius: '9px', fontSize: '13px' }}>P</div>
              <div className="min-w-0">
                <p className="gradient-text font-bold" style={{ fontSize: '13.5px', letterSpacing: '-0.03em', lineHeight: 1.2 }}>Prep Helper</p>
                <p style={{ color: 'var(--t3)', fontSize: '9.5px', fontWeight: 600, letterSpacing: '0.05em', textTransform: 'uppercase' }}>Active AI</p>
              </div>
            </div>
            <button onClick={onToggle} className="flex items-center justify-center transition-all hover:scale-105" style={{ width: '28px', height: '28px', borderRadius: '8px', backgroundColor: 'var(--raised)', border: '1px solid var(--border-s)', cursor: 'pointer', flexShrink: 0 }} aria-label="Collapse">
              <svg width="11" height="11" viewBox="0 0 12 12" fill="none"><path d="M7.5 2L4.5 6L7.5 10" stroke="var(--t3)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg>
            </button>
          </>
        ) : (
          <div className="flex flex-col items-center w-full gap-2 py-1">
            <div className="gradient-bg flex items-center justify-center text-white font-bold" style={{ width: '32px', height: '32px', borderRadius: '10px', fontSize: '14px' }}>P</div>
            <button onClick={onToggle} className="flex items-center justify-center transition-all hover:scale-105" style={{ width: '26px', height: '26px', borderRadius: '7px', backgroundColor: 'var(--raised)', border: '1px solid var(--border-s)', cursor: 'pointer' }} aria-label="Expand">
              <svg width="10" height="10" viewBox="0 0 12 12" fill="none"><path d="M4.5 2L7.5 6L4.5 10" stroke="var(--t3)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg>
            </button>
          </div>
        )}
      </div>

      {/* ── Nav ── */}
      <nav className="flex-1 overflow-y-auto" style={{ padding: open ? '10px 8px' : '10px 6px' }}>
        {open && <p style={{ color: 'var(--t3)', fontSize: '9px', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', padding: '0 8px', marginBottom: '6px' }}>Subjects</p>}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
          {subjects.map((s) => {
            const isActive  = activeSubject === s.name;
            const isHovered = hovered === s.name;
            return (
              <button
                key={s.name}
                onClick={() => onSubjectChange(s.name)}
                onMouseEnter={() => setHovered(s.name)}
                onMouseLeave={() => setHovered(null)}
                className="flex items-center w-full rounded-xl text-left transition-all duration-150"
                style={{
                  padding: open ? '9px 10px' : '9px',
                  justifyContent: open ? 'flex-start' : 'center',
                  gap: open ? '10px' : '0',
                  backgroundColor: isActive ? s.bg : isHovered ? 'rgba(255,255,255,0.03)' : 'transparent',
                  border: `1px solid ${isActive ? s.border : 'transparent'}`,
                  cursor: 'pointer',
                }}
              >
                <span className="shrink-0 flex items-center justify-center rounded-xl" style={{ width: '32px', height: '32px', fontSize: '15px', backgroundColor: isActive ? s.bg : 'var(--raised)', border: `1px solid ${isActive ? s.border : 'var(--border)'}` }}>
                  {s.icon}
                </span>
                {open && (
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <span style={{ fontSize: '13px', fontWeight: 700, color: isActive ? s.color : 'var(--t2)', letterSpacing: '-0.02em' }}>{s.name}</span>
                      <span style={{ fontSize: '11px', fontWeight: 700, color: isActive ? s.color : 'var(--t3)' }}>{s.progress}%</span>
                    </div>
                    <p style={{ fontSize: '10.5px', color: 'var(--t3)', fontWeight: 500, marginTop: '1px', marginBottom: '5px' }}>{s.tag}</p>
                    <div style={{ height: '2.5px', backgroundColor: 'rgba(255,255,255,0.07)', borderRadius: '99px', overflow: 'hidden' }}>
                      <div style={{ height: '100%', width: `${s.progress}%`, borderRadius: '99px', backgroundColor: s.color, opacity: isActive ? 1 : 0.4, transition: 'width 0.5s ease' }} />
                    </div>
                  </div>
                )}
              </button>
            );
          })}
        </div>

        {open && (
          <>
            <div style={{ height: '1px', backgroundColor: 'var(--border)', margin: '14px 4px 10px' }} />
            <p style={{ color: 'var(--t3)', fontSize: '9px', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', padding: '0 8px', marginBottom: '6px' }}>Recent</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
              {recentSessions.map((session) => (
                <button
                  key={session.title}
                  onMouseEnter={() => setHovered(session.title)}
                  onMouseLeave={() => setHovered(null)}
                  className="flex items-center w-full rounded-xl text-left transition-colors duration-150"
                  style={{ gap: '10px', padding: '7px 10px', border: 'none', cursor: 'pointer', backgroundColor: hovered === session.title ? 'rgba(255,255,255,0.04)' : 'transparent' }}
                >
                  <span className="flex items-center justify-center rounded-lg shrink-0" style={{ width: '26px', height: '26px', fontSize: '12px', backgroundColor: 'var(--raised)', border: '1px solid var(--border)' }}>{session.icon}</span>
                  <div className="min-w-0">
                    <p style={{ fontSize: '12px', fontWeight: 600, color: 'var(--t2)', lineHeight: 1.3 }}>{session.title}</p>
                    <p style={{ fontSize: '10px', color: 'var(--t3)', fontWeight: 500 }}>{session.subject} · {session.time}</p>
                  </div>
                </button>
              ))}
            </div>
          </>
        )}
      </nav>

      {/* ── Streak Card ── */}
      {open && (
        <div className="px-3 py-3" style={{ borderTop: '1px solid var(--border)' }}>
          <div style={{ background: 'linear-gradient(135deg, rgba(123,92,255,0.15), rgba(0,212,255,0.08))', border: '1px solid rgba(123,92,255,0.2)', borderRadius: '12px', padding: '10px 12px' }}>
            <div className="flex items-center gap-2 mb-2">
              <span style={{ fontSize: '16px' }}>🔥</span>
              <span style={{ fontSize: '18px', fontWeight: 700, color: 'var(--t1)', letterSpacing: '-0.03em' }}>{streakDays}</span>
              <span style={{ fontSize: '10.5px', color: 'var(--t2)', fontWeight: 500 }}>day streak</span>
            </div>
            <div className="flex gap-1">
              {Array.from({ length: totalDays }).map((_, i) => (
                <div key={i} style={{ flex: 1, height: '4px', borderRadius: '99px', backgroundColor: i < streakDays ? 'var(--amber)' : 'rgba(255,255,255,0.08)' }} />
              ))}
            </div>
          </div>
        </div>
      )}
    </aside>
  );
}