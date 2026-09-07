'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

type SidebarProps = {
  open: boolean;
  onToggle: () => void;
  activeSubject: string;
  onSubjectChange: (subject: string) => void;
};

type SubjectRow = {
  id: string;
  name: string;
  icon: string | null;
  color: string | null;
};

const FALLBACK_ICON = '📘';
const FALLBACK_COLOR = '#6C47FF';

export default function Sidebar({ open, onToggle, activeSubject, onSubjectChange }: SidebarProps) {
  const [hovered, setHovered] = useState<string | null>(null);
  const [loggingOut, setLoggingOut] = useState(false);
  const [subjects, setSubjects] = useState<SubjectRow[]>([]);
  const [loadingSubjects, setLoadingSubjects] = useState(true);
  const [streak, setStreak] = useState<number | null>(null);
  const router = useRouter();

  useEffect(() => {
    let cancelled = false;
    const supabase = createClient();

    async function loadSubjects() {
      setLoadingSubjects(true);
      const { data, error } = await supabase
        .from('subjects')
        .select('id, name, icon, color')
        .order('created_at', { ascending: true });

      if (cancelled) return;

      if (error) {
        console.error('Failed to load subjects:', error);
        setSubjects([]);
      } else {
        setSubjects(data || []);
      }
      setLoadingSubjects(false);
    }

    loadSubjects();

    const channel = supabase
      .channel('subjects-changes')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'subjects' },
        (payload) => {
          const newSubject = payload.new as SubjectRow;
          setSubjects((prev) => {
            if (prev.some((s) => s.id === newSubject.id)) return prev;
            return [...prev, newSubject];
          });
        }
      )
      .subscribe();

    return () => {
      cancelled = true;
      supabase.removeChannel(channel);
    };
  }, []);

  useEffect(() => {
    const fetchStreak = () => {
      const supabase = createClient();
      supabase.auth.getUser().then(({ data }) => {
        const userId = data.user?.id;
        if (!userId) return;
        fetch(`/api/streak?userId=${userId}`)
          .then((res) => res.json())
          .then((d) => setStreak(d.streak ?? null))
          .catch((err) => console.error('Sidebar streak fetch failed:', err));
      });
    };

    fetchStreak();
    window.addEventListener('streak-updated', fetchStreak);
    return () => window.removeEventListener('streak-updated', fetchStreak);
  }, []);

  const handleLogout = async () => {
    if (loggingOut) return;
    setLoggingOut(true);
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push('/login');
    router.refresh();
  };

  return (
    <aside
      className="flex flex-col h-full shrink-0 transition-all duration-300 relative z-20"
      style={{
        width: open ? '252px' : '76px',
        backgroundColor: 'var(--panel-bg)',
        borderRight: '1px solid var(--border)',
      }}
    >
      {/* ── Header ── */}
      <div className="flex items-center h-16 shrink-0" style={{ padding: open ? '0 16px' : '0 12px', borderBottom: '1px solid var(--border)' }}>
        {open ? (
          <>
            <div className="flex items-center gap-3 flex-1 min-w-0">
              <div className="brand-gradient-bg flex items-center justify-center text-white font-bold shrink-0" style={{ width: '32px', height: '32px', borderRadius: '10px', fontSize: '14px' }}>P</div>
              <div className="min-w-0">
                <p className="brand-gradient-text font-bold" style={{ fontSize: '14px', letterSpacing: '-0.03em', lineHeight: 1.2 }}>Prep Helper</p>
                <p style={{ color: 'var(--text-faint)', fontSize: '9.5px', fontWeight: 600, letterSpacing: '0.05em', textTransform: 'uppercase' }}>Active AI</p>
              </div>
            </div>
            <button onClick={onToggle} className="flex items-center justify-center transition-all hover:scale-105" style={{ width: '30px', height: '30px', borderRadius: '8px', backgroundColor: 'var(--surface-raised)', border: '1px solid var(--border)', cursor: 'pointer', flexShrink: 0 }} aria-label="Collapse">
              <svg width="11" height="11" viewBox="0 0 12 12" fill="none"><path d="M7.5 2L4.5 6L7.5 10" stroke="var(--text-faint)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg>
            </button>
          </>
        ) : (
          <div className="flex flex-col items-center w-full gap-3 py-2">
            <div className="brand-gradient-bg flex items-center justify-center text-white font-bold" style={{ width: '34px', height: '34px', borderRadius: '11px', fontSize: '15px' }}>P</div>
            <button onClick={onToggle} className="flex items-center justify-center transition-all hover:scale-105" style={{ width: '28px', height: '28px', borderRadius: '7px', backgroundColor: 'var(--surface-raised)', border: '1px solid var(--border)', cursor: 'pointer' }} aria-label="Expand">
              <svg width="10" height="10" viewBox="0 0 12 12" fill="none"><path d="M4.5 2L7.5 6L4.5 10" stroke="var(--text-faint)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg>
            </button>
          </div>
        )}
      </div>

      {/* ── Nav ── */}
      <nav className="flex-1 overflow-y-auto" style={{ padding: open ? '16px 12px' : '16px 10px' }}>
        {open && <p style={{ color: 'var(--text-faint)', fontSize: '9px', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', padding: '0 8px', marginBottom: '10px' }}>Subjects</p>}

        {loadingSubjects && open && (
          <p style={{ color: 'var(--text-faint)', fontSize: '11px', padding: '0 8px' }}>Loading…</p>
        )}

        {!loadingSubjects && subjects.length === 0 && open && (
          <p style={{ color: 'var(--text-faint)', fontSize: '11px', padding: '0 8px', lineHeight: 1.5 }}>
            No subjects yet — load a lecture and one will appear here automatically.
          </p>
        )}

        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
          {subjects.map((s) => {
            const isActive  = activeSubject === s.name;
            const isHovered = hovered === s.name;
            const color = s.color || FALLBACK_COLOR;
            const icon  = s.icon || FALLBACK_ICON;
            return (
              <button
                key={s.id}
                onClick={() => onSubjectChange(s.name)}
                onMouseEnter={() => setHovered(s.name)}
                onMouseLeave={() => setHovered(null)}
                className="flex items-center w-full rounded-xl text-left transition-all duration-150"
                style={{
                  padding: open ? '11px 12px' : '11px',
                  justifyContent: open ? 'flex-start' : 'center',
                  gap: open ? '12px' : '0',
                  backgroundColor: isActive ? `${color}1A` : isHovered ? 'rgba(255,255,255,0.03)' : 'transparent',
                  border: `1px solid ${isActive ? `${color}38` : 'transparent'}`,
                  cursor: 'pointer',
                }}
              >
                <span className="shrink-0 flex items-center justify-center rounded-xl" style={{ width: '34px', height: '34px', fontSize: '16px', backgroundColor: isActive ? `${color}1A` : 'var(--surface-raised)', border: `1px solid ${isActive ? `${color}38` : 'var(--border)'}` }}>
                  {icon}
                </span>
                {open && (
                  <div className="flex-1 min-w-0">
                    <span style={{ fontSize: '13px', fontWeight: 700, color: isActive ? color : 'var(--text-muted)', letterSpacing: '-0.02em' }}>{s.name}</span>
                  </div>
                )}
              </button>
            );
          })}
        </div>

        {open && (
          <>
            <div style={{ height: '1px', backgroundColor: 'var(--border)', margin: '18px 4px 14px' }} />
            <p style={{ color: 'var(--text-faint)', fontSize: '9px', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', padding: '0 8px', marginBottom: '10px' }}>Recent</p>
            <p style={{ color: 'var(--text-faint)', fontSize: '11px', padding: '0 8px', lineHeight: 1.5 }}>
              No recent sessions yet — load a lecture to get started.
            </p>
          </>
        )}
      </nav>

      {/* ── Streak Card ── */}
      {open && (
        <div className="px-4 py-4" style={{ borderTop: '1px solid var(--border)' }}>
          <div style={{ background: 'linear-gradient(135deg, rgba(108,71,255,0.15), rgba(240,165,0,0.08))', border: '1px solid rgba(108,71,255,0.22)', borderRadius: '12px', padding: '12px 14px' }}>
            <div className="flex items-center gap-2 mb-1">
              <span style={{ fontSize: '16px' }}>🔥</span>
              <span style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-main)', letterSpacing: '-0.02em' }}>
                {streak !== null && streak > 0 ? `${streak}-day streak` : 'Streak tracking'}
              </span>
            </div>
            <p style={{ fontSize: '10.5px', color: 'var(--text-faint)', fontWeight: 500 }}>
              {streak !== null && streak > 0
                ? 'Keep it going — load a lecture today to extend it.'
                : 'Load a lecture today to start your streak.'}
            </p>
          </div>
        </div>
      )}

      {/* ── Logout ── */}
      <div className="px-3 py-3" style={{ borderTop: '1px solid var(--border)' }}>
        <button
          onClick={handleLogout}
          disabled={loggingOut}
          className="flex items-center w-full rounded-xl text-left transition-colors duration-150"
          style={{
            padding: open ? '10px 12px' : '10px',
            justifyContent: open ? 'flex-start' : 'center',
            gap: open ? '10px' : '0',
            backgroundColor: 'transparent',
            border: '1px solid var(--border)',
            cursor: loggingOut ? 'default' : 'pointer',
            opacity: loggingOut ? 0.6 : 1,
          }}
          aria-label="Log out"
        >
          <span className="shrink-0 flex items-center justify-center rounded-lg" style={{ width: '28px', height: '28px', fontSize: '14px', backgroundColor: 'var(--surface-raised)', border: '1px solid var(--border)' }}>
            🚪
          </span>
          {open && (
            <span style={{ fontSize: '12.5px', fontWeight: 600, color: 'var(--text-muted)' }}>
              {loggingOut ? 'Logging out…' : 'Log out'}
            </span>
          )}
        </button>
      </div>
    </aside>
  );
}