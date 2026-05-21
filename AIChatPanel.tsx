'use client';
import { useState, useEffect, useRef } from 'react';

type Message = {
  role: 'user' | 'ai';
  text: string;
  time: string;
};

type AIChatPanelProps = {
  darkMode: boolean;
  onToggleDark: () => void;
  transcript: string;
  activeSubject: string;
};

const subjectData: Record<string, { color: string; bg: string; border: string; icon: string; concepts: number; accuracy: string; studyTime: string; progress: number }> = {
  'Physics':     { color: '#FFA826', bg: 'rgba(255,168,38,0.08)',  border: 'rgba(255,168,38,0.2)',  icon: '⚡', concepts: 12, accuracy: '94%', studyTime: '2h',  progress: 68 },
  'Chemistry':   { color: '#00E5A0', bg: 'rgba(0,229,160,0.07)',   border: 'rgba(0,229,160,0.18)',  icon: '🧪', concepts: 8,  accuracy: '87%', studyTime: '1h',  progress: 45 },
  'Mathematics': { color: '#FF5060', bg: 'rgba(255,80,96,0.07)',   border: 'rgba(255,80,96,0.18)',  icon: '📐', concepts: 10, accuracy: '79%', studyTime: '3h',  progress: 52 },
  'Biology':     { color: '#8FFF5A', bg: 'rgba(143,255,90,0.06)',  border: 'rgba(143,255,90,0.15)', icon: '🧬', concepts: 5,  accuracy: '91%', studyTime: '45m', progress: 30 },
};

const macros = [
  { icon: '👶', label: '10yo Style', sub: 'Super simple',  accent: '#FFA826', accentBg: 'rgba(255,168,38,0.12)' },
  { icon: '💡', label: 'Example',    sub: 'Show me one',   accent: '#00E5A0', accentBg: 'rgba(0,229,160,0.10)'  },
  { icon: '❓', label: 'Quiz Me',    sub: 'Test myself',   accent: '#A08BFF', accentBg: 'rgba(123,92,255,0.14)' },
  { icon: '📊', label: 'Cheat Sheet', sub: 'Key points',   accent: '#FF5060', accentBg: 'rgba(255,80,96,0.10)'  },
];

const macroPrompts: Record<string, string> = {
  '10yo Style':  'Explain the main concept from this lecture as if I am a 10-year-old. Use simple words, fun analogies, make it memorable.',
  'Example':     'Give me a clear worked example of the key concept from this lecture. Walk me through it step by step.',
  'Quiz Me':     'Create one multiple-choice question (4 options, A-D) testing my understanding of the main concept in this lecture. Wait for my answer.',
  'Cheat Sheet': 'Give me a concise cheat sheet of the most important formulas, definitions, and concepts from this lecture. Use bullet points.',
};

export default function AIChatPanel({ darkMode, onToggleDark, transcript, activeSubject }: AIChatPanelProps) {
  const [messages,     setMessages]     = useState<Message[]>([]);
  const [input,        setInput]        = useState('');
  const [isLoading,    setIsLoading]    = useState(false);
  const [hoveredMacro, setHoveredMacro] = useState<string | null>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);

  const subject = subjectData[activeSubject] || subjectData['Physics'];
  const getTime = () => new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  const handleSend = async (text?: string) => {
    const msg = text || input;
    if (!msg.trim() || isLoading) return;

    const userMessage: Message = { role: 'user', text: msg, time: getTime() };
    setMessages((prev) => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    try {
      const history = [...messages, userMessage].map((m) => ({
        role: m.role === 'ai' ? 'assistant' : 'user',
        content: m.text,
      }));

      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: history, transcript, subject: activeSubject }),
      });

      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setMessages((prev) => [...prev, { role: 'ai', text: data.text, time: getTime() }]);
    } catch (err: unknown) {
      const errMsg = err instanceof Error ? err.message : 'Unknown error';
      setMessages((prev) => [...prev, { role: 'ai', text: `⚠️ ${errMsg}`, time: getTime() }]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <aside className="flex flex-col h-full shrink-0 hide-mobile" style={{ width: '310px', backgroundColor: 'var(--card)', borderLeft: '1px solid var(--border)' }}>

      {/* Rainbow top line */}
      <div style={{ height: '2.5px', background: 'linear-gradient(90deg, #7B5CFF, #00D4FF, #00E5A0)', flexShrink: 0 }} />

      {/* ── Subject Spotlight ── */}
      <div className="shrink-0" style={{ padding: '12px 14px', borderBottom: '1px solid var(--border)', background: `linear-gradient(135deg, ${subject.bg}, transparent)` }}>
        <div className="flex items-center justify-between mb-3">
          <p style={{ fontSize: '9px', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--t3)' }}>Active Subject</p>
          <button onClick={onToggleDark} className="flex items-center justify-center rounded-lg transition-all hover:scale-105" style={{ width: '28px', height: '28px', backgroundColor: 'var(--raised)', border: '1px solid var(--border-s)', fontSize: '13px', cursor: 'pointer' }} aria-label="Toggle theme">
            {darkMode ? '☀️' : '🌙'}
          </button>
        </div>

        {/* Subject row */}
        <div className="flex items-center gap-3 mb-3">
          <div className="flex items-center justify-center rounded-2xl shrink-0" style={{ width: '44px', height: '44px', fontSize: '22px', backgroundColor: subject.bg, border: `1px solid ${subject.border}` }}>
            {subject.icon}
          </div>
          <div className="flex-1 min-w-0">
            <p style={{ fontSize: '16px', fontWeight: 700, color: subject.color, letterSpacing: '-0.03em', lineHeight: 1.2 }}>{activeSubject}</p>
            <p style={{ fontSize: '10.5px', color: 'var(--t3)', fontWeight: 500, marginBottom: '5px' }}>JEE Advanced · {subject.progress}% complete</p>
            <div style={{ height: '4px', background: 'rgba(255,255,255,0.07)', borderRadius: '99px', overflow: 'hidden' }}>
              <div style={{ height: '100%', width: `${subject.progress}%`, borderRadius: '99px', backgroundColor: subject.color, transition: 'width 0.5s ease' }} />
            </div>
          </div>
        </div>

        {/* Stats row */}
        <div className="grid grid-cols-3 gap-2">
          {[
            { val: subject.concepts, label: 'Concepts', color: subject.color },
            { val: subject.accuracy, label: 'Accuracy', color: 'var(--cyan)' },
            { val: subject.studyTime, label: 'Today',  color: 'var(--mint)' },
          ].map((stat) => (
            <div key={stat.label} style={{ backgroundColor: 'var(--raised)', border: '1px solid var(--border)', borderRadius: '8px', padding: '7px 8px' }}>
              <p style={{ fontSize: '15px', fontWeight: 700, color: stat.color, letterSpacing: '-0.02em' }}>{stat.val}</p>
              <p style={{ fontSize: '9px', fontWeight: 600, color: 'var(--t3)', textTransform: 'uppercase', letterSpacing: '0.05em', marginTop: '1px' }}>{stat.label}</p>
            </div>
          ))}
        </div>
      </div>

      {/* ── Macros ── */}
      <div className="grid grid-cols-2 gap-1.5 shrink-0" style={{ padding: '10px 12px', borderBottom: '1px solid var(--border)' }}>
        {macros.map((m) => {
          const isHovered = hoveredMacro === m.label;
          return (
            <button
              key={m.label}
              onClick={() => handleSend(macroPrompts[m.label])}
              onMouseEnter={() => setHoveredMacro(m.label)}
              onMouseLeave={() => setHoveredMacro(null)}
              disabled={isLoading}
              className="flex items-center gap-2 rounded-xl text-left transition-all duration-150 disabled:opacity-40 disabled:cursor-not-allowed"
              style={{ padding: '8px 10px', backgroundColor: isHovered ? 'var(--input)' : 'var(--raised)', border: `1px solid ${isHovered ? m.accent + '40' : 'var(--border)'}`, cursor: 'pointer' }}
            >
              <span className="flex items-center justify-center rounded-lg shrink-0" style={{ width: '28px', height: '28px', backgroundColor: m.accentBg, fontSize: '14px' }}>{m.icon}</span>
              <div>
                <p style={{ fontSize: '12px', fontWeight: 700, color: 'var(--t1)', letterSpacing: '-0.01em' }}>{m.label}</p>
                <p style={{ fontSize: '9.5px', color: 'var(--t3)', fontWeight: 500 }}>{m.sub}</p>
              </div>
            </button>
          );
        })}
      </div>

      {/* ── Chat Area ── */}
      <div className="flex-1 overflow-y-auto" style={{ padding: '12px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
        {messages.length === 0 && (
          <div className="animate-fade-in rounded-2xl p-4" style={{ background: 'linear-gradient(135deg, rgba(123,92,255,0.1), rgba(0,212,255,0.05))', border: '1px solid rgba(123,92,255,0.18)', borderTopLeftRadius: '4px' }}>
            <p className="gradient-text font-bold" style={{ fontSize: '13px', marginBottom: '7px', letterSpacing: '-0.02em' }}>Prep Helper AI 🤖</p>
            <p style={{ fontSize: '13px', color: 'var(--t2)', lineHeight: 1.65, fontWeight: 500 }}>
              Paste a YouTube lecture URL and I&apos;ll watch it with you — pausing at key concept moments to quiz you{' '}
              <strong style={{ color: '#A08BFF', fontWeight: 600 }}>before</strong> you scroll past them.
            </p>
            <div className="flex flex-wrap gap-1.5 mt-3">
              {['JEE Physics', 'Board Chem', 'Math Derivations'].map((tag) => (
                <span key={tag} style={{ fontSize: '10.5px', padding: '2px 9px', borderRadius: '99px', backgroundColor: 'rgba(123,92,255,0.12)', color: '#9A80FF', border: '1px solid rgba(123,92,255,0.2)', fontWeight: 600 }}>{tag}</span>
              ))}
            </div>
          </div>
        )}

        {messages.map((msg, i) => (
          <div key={i} className="animate-fade-in flex flex-col" style={{ alignItems: msg.role === 'user' ? 'flex-end' : 'flex-start' }}>
            <div style={
              msg.role === 'user'
                ? { background: 'linear-gradient(135deg, #7B5CFF, #5B8DEF)', color: 'white', borderRadius: '16px 16px 4px 16px', padding: '10px 14px', maxWidth: '88%', fontSize: '13.5px', lineHeight: 1.6, boxShadow: '0 2px 12px rgba(123,92,255,0.3)', fontWeight: 500 }
                : { backgroundColor: 'var(--raised)', color: 'var(--t1)', border: '1px solid var(--border)', borderRadius: '16px 16px 16px 4px', padding: '10px 14px', maxWidth: '88%', fontSize: '13.5px', lineHeight: 1.6, whiteSpace: 'pre-wrap', fontWeight: 500 }
            }>
              {msg.text}
            </div>
            <span style={{ fontSize: '10px', color: 'var(--t3)', marginTop: '3px', paddingInline: '2px', fontWeight: 500 }}>{msg.time}</span>
          </div>
        ))}

        {isLoading && (
          <div className="animate-fade-in flex flex-col items-start">
            <div style={{ backgroundColor: 'var(--raised)', border: '1px solid var(--border)', borderRadius: '16px 16px 16px 4px', padding: '12px 16px' }}>
              <div className="typing-dots"><span /><span /><span /></div>
            </div>
          </div>
        )}
        <div ref={chatEndRef} />
      </div>

      {/* ── Input ── */}
      <div className="shrink-0" style={{ padding: '10px 12px 12px', borderTop: '1px solid var(--border)' }}>
        <div className="flex items-center gap-2" style={{ backgroundColor: 'var(--raised)', border: '1.5px solid var(--border-s)', borderRadius: '12px', padding: '6px 6px 6px 12px' }}>
          <input
            type="text" value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && handleSend()}
            placeholder="Ask anything about the lecture…"
            disabled={isLoading}
            style={{ flex: 1, border: 'none', outline: 'none', background: 'transparent', fontSize: '13px', color: 'var(--t1)', minWidth: 0 }}
          />
          <button
            onClick={() => handleSend()}
            disabled={isLoading || !input.trim()}
            className="gradient-bg flex items-center justify-center text-white font-bold rounded-xl transition-all hover:scale-105 shrink-0 disabled:opacity-40 disabled:cursor-not-allowed disabled:transform-none"
            style={{ width: '32px', height: '32px', fontSize: '14px', cursor: 'pointer', border: 'none' }}
            aria-label="Send"
          >↑</button>
        </div>
        <p style={{ textAlign: 'center', fontSize: '10.5px', color: 'var(--t3)', marginTop: '7px', fontWeight: 500 }}>🎙️ Voice input · coming Day 6</p>
      </div>
    </aside>
  );
}