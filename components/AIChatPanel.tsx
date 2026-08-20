'use client';
import { useState, useEffect, useRef } from 'react';

type Message = {
  role: 'user' | 'ai';
  text: string;
  time: string;
  isHtml?: boolean;       // if true, render as HTML instead of plain text
  isSummary?: boolean;    // if true, render with distinct session-summary style
};

type AIChatPanelProps = {
  darkMode: boolean;
  onToggleDark: () => void;
  transcript: string;
  activeSubject: string;
};

const macros = [
  { icon: '👶', label: '10yo Style',  sub: 'Super simple',  accent: '#F0A500', accentBg: 'rgba(240,165,0,0.12)'  },
  { icon: '💡', label: 'Example',     sub: 'Show me one',   accent: '#00E5A0', accentBg: 'rgba(0,229,160,0.10)'  },
  { icon: '❓', label: 'Quiz Me',     sub: 'Test myself',   accent: '#A08BFF', accentBg: 'rgba(108,71,255,0.14)' },
  { icon: '📊', label: 'Cheat Sheet', sub: 'Key points',    accent: '#FF5060', accentBg: 'rgba(255,80,96,0.10)'  },
  { icon: '⚡', label: '80-20',       sub: 'Vital concepts', accent: '#6C47FF', accentBg: 'rgba(108,71,255,0.12)' },
];

const macroPrompts: Record<string, string> = {
  '10yo Style':  'Explain the main concept from this lecture as if I am a 10-year-old. Use simple words, fun analogies, make it memorable. Format your response in clean HTML using <strong> for key terms, <ul><li> for lists, and <p> for paragraphs. No markdown asterisks.',
  'Example':     'Give me a clear worked example of the key concept from this lecture. Walk me through it step by step. Format using <strong> for key steps, <ol><li> for numbered steps, <p> for explanation. No markdown asterisks.',
  'Quiz Me':     'Create one multiple-choice question (4 options, A-D) testing my understanding of the main concept in this lecture. Wait for my answer. Format in clean HTML.',
  'Cheat Sheet': `Give me a concise cheat sheet of the most important formulas, definitions, and concepts from this lecture.

Format your response as clean HTML exactly like this structure:
<h4>📌 Key Concepts</h4>
<ul>
  <li><strong>Concept name</strong> — short definition or formula</li>
  <li><strong>Concept name</strong> — short definition or formula</li>
</ul>
<h4>🧮 Formulas</h4>
<ul>
  <li><strong>Formula name:</strong> F = ma</li>
</ul>
<h4>⚡ Quick Facts</h4>
<ul>
  <li>One-line fact worth remembering</li>
</ul>

Use ONLY these HTML tags: h4, ul, li, strong, p. No markdown. No asterisks. No backticks.`,
};

const macroPromptsNoTranscript: Record<string, string> = {
  '10yo Style':  'No lecture is loaded yet. Pick a commonly confusing concept in this subject and explain it as if I am a 10-year-old, using simple words and analogies. Format in clean HTML using <strong>, <ul><li>, <p>. No markdown asterisks.',
  'Example':     'No lecture is loaded yet. Give me a clear worked example of a commonly tested concept in this subject. Walk me through it step by step. Format using <strong>, <ol><li>, <p>.',
  'Quiz Me':     'No lecture is loaded yet. Create one general-knowledge multiple-choice question (4 options, A-D) on a commonly tested topic in this subject, clearly labeled as general knowledge. Format in clean HTML.',
  'Cheat Sheet': 'No lecture is loaded yet. Give me a concise general cheat sheet of commonly important formulas and concepts in this subject. Label it as general knowledge. Format as clean HTML with <h4> section headers, <ul><li> for points, <strong> for key terms. No markdown asterisks.',
};

// Converts a plain-text response that still contains markdown asterisks
// into clean HTML — defensive fallback in case the model ignores our HTML
// instruction.
function markdownToHtml(text: string): string {
  return text
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.+?)\*/g, '<em>$1</em>')
    .replace(/^#{1,4}\s+(.+)$/gm, '<h4>$1</h4>')
    .replace(/^[\*\-]\s+(.+)$/gm, '<li>$1</li>')
    .replace(/(<li>.*<\/li>(\n|$))+/g, '<ul>$&</ul>')
    .replace(/\n{2,}/g, '</p><p>')
    .replace(/^(?!<[hul]|<\/[hul]|<li|<p|<\/p)(.+)$/gm, '<p>$1</p>')
    .replace(/<p><\/p>/g, '')
    .trim();
}

export default function AIChatPanel({ darkMode, onToggleDark, transcript, activeSubject }: AIChatPanelProps) {
  const [messages,     setMessages]     = useState<Message[]>([]);
  const [input,        setInput]        = useState('');
  const [isLoading,    setIsLoading]    = useState(false);
  const [hoveredMacro, setHoveredMacro] = useState<string | null>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);

  const getTime = () => new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  const handleMacroClick = (label: string) => {
    if (label === '80-20') {
      window.dispatchEvent(new CustomEvent('show-pareto'));
      return;
    }
    const prompt = transcript ? macroPrompts[label] : macroPromptsNoTranscript[label];
    // BUG FIX: previously handleSend(prompt) alone meant the FULL raw prompt
    // (including all the HTML formatting instructions) was displayed as the
    // visible "you asked" chat bubble — confusing and unprofessional-looking.
    // Now we pass a short clean label to SHOW, while the detailed prompt is
    // still what's actually SENT to the AI. The student sees "Cheat Sheet",
    // the AI receives the full formatting instructions, silently.
    handleSend(prompt, label);
  };

  useEffect(() => {
    const handleSessionComplete = async (e: Event) => {
      const { checkpoints } = (e as CustomEvent).detail || {};
      if (!checkpoints || checkpoints.length === 0) return;

      const conceptList = checkpoints
        .map((cp: { start: number; question: string }) => {
          const mins = Math.floor(cp.start / 60);
          const secs = Math.floor(cp.start % 60).toString().padStart(2, '0');
          return `<li><strong>${mins}:${secs}</strong> — ${cp.question.replace(/\?$/, '').trim()}</li>`;
        })
        .join('\n');

      const summaryHtml = `
        <h4>📋 Session Summary</h4>
        <p>You just covered <strong>${checkpoints.length} key concept${checkpoints.length > 1 ? 's' : ''}</strong> in this lecture:</p>
        <ul>${conceptList}</ul>
        <p style="margin-top:8px; font-size:12px; color:var(--text-faint)">Keep these in mind — they're the moments worth revisiting.</p>
      `.trim();

      setMessages((prev) => [
        ...prev,
        { role: 'ai', text: summaryHtml, time: getTime(), isHtml: true, isSummary: true },
      ]);
    };

    window.addEventListener('session-complete', handleSessionComplete);
    return () => window.removeEventListener('session-complete', handleSessionComplete);
  }, []);

  // BUG FIX: Workspace fires this when a new video starts loading. Without
  // this listener, chat history from every previously-tested video in this
  // session kept accumulating silently and got re-sent on every message —
  // the actual cause of hitting Groq's rate limit after just 1-2 messages,
  // regardless of the current video's length.
  useEffect(() => {
    const handleVideoChanged = () => {
      setMessages([]);
    };
    window.addEventListener('video-changed', handleVideoChanged);
    return () => window.removeEventListener('video-changed', handleVideoChanged);
  }, []);

  // BUG FIX: handleSend now takes an OPTIONAL second parameter, displayLabel.
  // - When the student types their own message, displayLabel is omitted, so
  //   the message they see IS what they typed (unchanged behavior).
  // - When a macro button is clicked, displayLabel is the short button name
  //   ("Cheat Sheet", "Quiz Me", etc), while `text` remains the full detailed
  //   prompt sent to the AI. This is the actual fix for the prompt-leak bug.
  const handleSend = async (text?: string, displayLabel?: string) => {
    const msg = text || input;
    if (!msg.trim() || isLoading) return;

    const userMessage: Message = { role: 'user', text: displayLabel || msg, time: getTime() };
    setMessages((prev) => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    try {
      // IMPORTANT: conversation history sent to the AI must still use the
      // FULL prompt text, not the display label — otherwise the AI would
      // only ever see "Cheat Sheet" as the user's message and lose all the
      // formatting instructions. We rebuild history using the real prompt
      // for this message, while past messages already only ever stored what
      // was actually sent (macros before this fix stored the full text too).
      const history = [...messages, { ...userMessage, text: msg }].map((m) => ({
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

      // BUG FIX: markdownToHtml() was running unconditionally on every
      // response, including ones that were ALREADY valid HTML from the AI
      // (Cheat Sheet, etc). Its regex is designed for converting plain
      // markdown text — running it on existing HTML tags corrupted the
      // structure, turning most <li> items into empty <ul></ul> shells.
      // Fix: detect if the response already contains real HTML tags; only
      // fall back to markdownToHtml() for genuine plain-text responses that
      // still have stray markdown asterisks.
      const alreadyHtml = /<(h4|ul|ol|li|p|strong|em)\b/i.test(data.text);
      const htmlText = alreadyHtml ? data.text : markdownToHtml(data.text);

      setMessages((prev) => [
        ...prev,
        { role: 'ai', text: htmlText, time: getTime(), isHtml: true },
      ]);
    } catch (err: unknown) {
      const rawMsg = err instanceof Error ? err.message : 'Unknown error';

      // UX FIX: Groq's raw rate-limit error is technical and ugly ("Rate
      // limit reached for model... service tier: on_demand... Limit 8000,
      // Used 5047, Requested 7044. Please try again in 30.68s..."). Showing
      // that directly to a student looks broken, not busy. Detect this
      // specific error and show a friendly message instead, extracting the
      // actual wait time from Groq's message when present.
      const isRateLimit = /rate limit/i.test(rawMsg);
      let displayMsg = rawMsg;

      if (isRateLimit) {
        const waitMatch = rawMsg.match(/try again in ([\d.]+)s/i);
        const waitSeconds = waitMatch ? Math.ceil(parseFloat(waitMatch[1])) : null;
        displayMsg = waitSeconds
          ? `We're getting a lot of questions right now! Give it about ${waitSeconds} seconds and try again.`
          : "We're getting a lot of questions right now! Give it a moment and try again.";
      }

      setMessages((prev) => [...prev, { role: 'ai', text: isRateLimit ? displayMsg : `⚠️ ${displayMsg}`, time: getTime() }]);
    } finally {
      setIsLoading(false);
    }
  };

  const aiStatus = isLoading ? 'Thinking…' : transcript ? 'Ready — lecture loaded' : 'Ready — waiting for a lecture';

  return (
    <aside className="flex flex-col h-full shrink-0 hide-mobile" style={{ width: '320px', backgroundColor: 'var(--panel-bg)', borderLeft: '1px solid var(--border)' }}>

      <div className="brand-gradient-bg" style={{ height: '2.5px', flexShrink: 0 }} />

      <div className="shrink-0" style={{ padding: '14px 16px', borderBottom: '1px solid var(--border)' }}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3 min-w-0">
            <div className="flex items-center justify-center rounded-xl shrink-0 brand-gradient-bg" style={{ width: '36px', height: '36px', fontSize: '16px' }}>
              🤖
            </div>
            <div className="min-w-0">
              <p style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-main)', letterSpacing: '-0.02em', lineHeight: 1.2 }}>Prep Helper AI</p>
              <p style={{ fontSize: '10.5px', color: 'var(--text-faint)', fontWeight: 500 }}>{aiStatus}</p>
            </div>
          </div>
          <button onClick={onToggleDark} className="flex items-center justify-center rounded-lg transition-all hover:scale-105 shrink-0" style={{ width: '28px', height: '28px', backgroundColor: 'var(--surface-raised)', border: '1px solid var(--border)', fontSize: '13px', cursor: 'pointer' }} aria-label="Toggle theme">
            {darkMode ? '☀️' : '🌙'}
          </button>
        </div>
      </div>

      <div className="shrink-0" style={{ padding: '12px 14px', borderBottom: '1px solid var(--border)' }}>
        <div className="grid grid-cols-2 gap-1.5">
          {macros.slice(0, 4).map((m) => {
            const isHovered = hoveredMacro === m.label;
            return (
              <button
                key={m.label}
                onClick={() => handleMacroClick(m.label)}
                onMouseEnter={() => setHoveredMacro(m.label)}
                onMouseLeave={() => setHoveredMacro(null)}
                disabled={isLoading}
                className="flex items-center gap-2 rounded-xl text-left transition-all duration-150 disabled:opacity-40 disabled:cursor-not-allowed"
                style={{ padding: '9px 11px', backgroundColor: isHovered ? 'var(--input-bg)' : 'var(--surface-raised)', border: `1px solid ${isHovered ? m.accent + '40' : 'var(--border)'}`, cursor: 'pointer' }}
              >
                <span className="flex items-center justify-center rounded-lg shrink-0" style={{ width: '28px', height: '28px', backgroundColor: m.accentBg, fontSize: '14px' }}>{m.icon}</span>
                <div>
                  <p style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-main)', letterSpacing: '-0.01em' }}>{m.label}</p>
                  <p style={{ fontSize: '9.5px', color: 'var(--text-faint)', fontWeight: 500 }}>{m.sub}</p>
                </div>
              </button>
            );
          })}
        </div>
        {(() => {
          const m = macros[4];
          const isHovered = hoveredMacro === m.label;
          return (
            <button
              key={m.label}
              onClick={() => handleMacroClick(m.label)}
              onMouseEnter={() => setHoveredMacro(m.label)}
              onMouseLeave={() => setHoveredMacro(null)}
              className="flex items-center gap-2 rounded-xl text-left transition-all duration-150 w-full mt-1.5"
              style={{ padding: '9px 11px', backgroundColor: isHovered ? 'var(--input-bg)' : 'var(--surface-raised)', border: `1px solid ${isHovered ? m.accent + '40' : 'rgba(108,71,255,0.2)'}`, cursor: 'pointer' }}
            >
              <span className="flex items-center justify-center rounded-lg shrink-0" style={{ width: '28px', height: '28px', backgroundColor: m.accentBg, fontSize: '14px' }}>{m.icon}</span>
              <div>
                <p style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-main)', letterSpacing: '-0.01em' }}>{m.label} Pareto</p>
                <p style={{ fontSize: '9.5px', color: 'var(--text-faint)', fontWeight: 500 }}>{m.sub}</p>
              </div>
            </button>
          );
        })()}
      </div>

      <div className="flex-1 overflow-y-auto" style={{ padding: '14px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
        {messages.length === 0 && (
          <div className="animate-fade-in rounded-2xl p-4" style={{ background: 'linear-gradient(135deg, rgba(108,71,255,0.1), rgba(240,165,0,0.05))', border: '1px solid rgba(108,71,255,0.18)', borderTopLeftRadius: '4px' }}>
            <p className="brand-gradient-text font-bold" style={{ fontSize: '13px', marginBottom: '7px', letterSpacing: '-0.02em' }}>Prep Helper AI 🤖</p>
            <p style={{ fontSize: '13px', color: 'var(--text-muted)', lineHeight: 1.65, fontWeight: 500 }}>
              Paste a YouTube lecture URL and I&apos;ll watch it with you — pausing at key concept moments to quiz you{' '}
              <strong style={{ color: '#A08BFF', fontWeight: 600 }}>before</strong> you scroll past them.
            </p>
            <div className="flex flex-wrap gap-1.5 mt-3">
              {['JEE Physics', 'Board Chem', 'Math Derivations'].map((tag) => (
                <span key={tag} style={{ fontSize: '10.5px', padding: '2px 9px', borderRadius: '99px', backgroundColor: 'rgba(108,71,255,0.12)', color: '#9A80FF', border: '1px solid rgba(108,71,255,0.2)', fontWeight: 600 }}>{tag}</span>
              ))}
            </div>
          </div>
        )}

        {messages.map((msg, i) => (
          <div key={i} className="animate-fade-in flex flex-col" style={{ alignItems: msg.role === 'user' ? 'flex-end' : 'flex-start' }}>
            {msg.isSummary ? (
              <div
                className="ai-html-content"
                style={{
                  width: '100%',
                  background: 'linear-gradient(135deg, rgba(108,71,255,0.12), rgba(240,165,0,0.06))',
                  border: '1px solid rgba(108,71,255,0.25)',
                  borderRadius: '12px',
                  padding: '12px 14px',
                  fontSize: '12.5px',
                  lineHeight: 1.65,
                  color: 'var(--text-main)',
                }}
                dangerouslySetInnerHTML={{ __html: msg.text }}
              />
            ) : (
              <div
                className={msg.isHtml && msg.role === 'ai' ? 'ai-html-content' : undefined}
                style={
                  msg.role === 'user'
                    ? { background: 'var(--brand-gradient)', color: 'white', borderRadius: '16px 16px 4px 16px', padding: '10px 14px', maxWidth: '88%', fontSize: '13.5px', lineHeight: 1.6, boxShadow: '0 2px 12px rgba(108,71,255,0.3)', fontWeight: 500 }
                    : { backgroundColor: 'var(--surface-raised)', color: 'var(--text-main)', border: '1px solid var(--border)', borderRadius: '16px 16px 16px 4px', padding: '10px 14px', maxWidth: '88%', fontSize: '13.5px', lineHeight: 1.6, fontWeight: 500 }
                }
                {...(msg.isHtml && msg.role === 'ai'
                  ? { dangerouslySetInnerHTML: { __html: msg.text } }
                  : { children: msg.text }
                )}
              />
            )}
            <span style={{ fontSize: '10px', color: 'var(--text-faint)', marginTop: '3px', paddingInline: '2px', fontWeight: 500 }}>{msg.time}</span>
          </div>
        ))}

        {isLoading && (
          <div className="animate-fade-in flex flex-col items-start">
            <div style={{ backgroundColor: 'var(--surface-raised)', border: '1px solid var(--border)', borderRadius: '16px 16px 16px 4px', padding: '12px 16px' }}>
              <div className="typing-dots"><span /><span /><span /></div>
            </div>
          </div>
        )}
        <div ref={chatEndRef} />
      </div>

      <div className="shrink-0" style={{ padding: '12px 14px 14px', borderTop: '1px solid var(--border)' }}>
        <div className="flex items-center gap-2" style={{ backgroundColor: 'var(--surface-raised)', border: '1.5px solid var(--border)', borderRadius: '12px', padding: '6px 6px 6px 12px' }}>
          <input
            type="text" value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && handleSend()}
            placeholder="Ask anything about the lecture…"
            disabled={isLoading}
            style={{ flex: 1, border: 'none', outline: 'none', background: 'transparent', fontSize: '13px', color: 'var(--text-main)', minWidth: 0 }}
          />
          <button
            onClick={() => handleSend()}
            disabled={isLoading || !input.trim()}
            className="brand-gradient-bg flex items-center justify-center text-white font-bold rounded-xl transition-all hover:scale-105 shrink-0 disabled:opacity-40 disabled:cursor-not-allowed disabled:transform-none"
            style={{ width: '32px', height: '32px', fontSize: '14px', cursor: 'pointer', border: 'none' }}
            aria-label="Send"
          >↑</button>
        </div>
        <p style={{ textAlign: 'center', fontSize: '10.5px', color: 'var(--text-faint)', marginTop: '8px', fontWeight: 500 }}>🎙️ Voice input · coming soon</p>
      </div>
    </aside>
  );
}