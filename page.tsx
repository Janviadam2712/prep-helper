'use client';

import React, { useState } from 'react';
// Fixed icon names to match lucide-react exactly
import { 
  PlusCircle, 
  History, 
  BookOpen, 
  Settings, 
  Sun, 
  Moon, 
  Send, 
  Mic, 
  Video, 
  Layers, 
  Sparkles, 
  HelpCircle 
} from 'lucide-react';

// Using a relative path to guarantee Next.js finds your component instantly
import { CanvasLayer } from '../components/CanvasLayer'; 

export default function PrepHelperHome() {
  const [isDarkMode, setIsDarkMode] = useState(true);
  const [videoUrl, setVideoUrl] = useState('');
  const [isLoaded, setIsLoaded] = useState(false);
  const [chatInput, setChatInput] = useState('');

  const toggleTheme = () => setIsDarkMode(!isDarkMode);

  const applyMacroPrompt = (style: string) => {
    const macros: Record<string, string> = {
      kid: "Explain this concept like I'm a 10-year-old child with analogies.",
      examples: "Give me intuitive, real-world examples that are impossible to forget.",
      quiz: "Quiz me on the concept at this current timestamp with a challenging MCQ.",
      sheet: "Generate a summary cheat sheet of the key formulas shown in this section."
    };
    setChatInput(macros[style] || '');
  };

  return (
    <div className={`flex h-screen w-screen overflow-hidden ${isDarkMode ? 'dark' : ''}`}>
      
      {/* COLUMN 1: MINIMALIST SIDEBAR */}
      <aside className="w-16 md:w-64 flex flex-col justify-between border-r border-[var(--border)] bg-[var(--panel-bg)] p-4 transition-all">
        <div className="space-y-8">
          <div className="flex items-center gap-3 px-2">
            <div className="h-8 w-8 rounded-lg bg-[#0066FF] flex items-center justify-center text-white font-bold text-lg">P</div>
            <span className="font-bold text-lg tracking-tight hidden md:inline">Prep Helper</span>
          </div>

          <nav className="space-y-1">
            <button className="flex w-full items-center gap-3 rounded-xl bg-[#0066FF] px-3 py-2.5 text-white transition font-medium text-sm">
              <PlusCircle size={18} />
              <span className="hidden md:inline">New Study Session</span>
            </button>
            <button className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-[var(--text-muted)] hover:text-[var(--text-main)] hover:bg-[var(--border)] transition text-sm">
              <History size={18} />
              <span className="hidden md:inline">Revision Vault</span>
            </button>
            <button className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-[var(--text-muted)] hover:text-[var(--text-main)] hover:bg-[var(--border)] transition text-sm">
              <BookOpen size={18} />
              <span className="hidden md:inline">Saved Sheets</span>
            </button>
          </nav>
        </div>

        <div className="space-y-2">
          <button onClick={toggleTheme} className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-[var(--text-muted)] hover:text-[var(--text-main)] hover:bg-[var(--border)] transition text-sm">
            {isDarkMode ? <Sun size={18} className="text-yellow-500" /> : <Moon size={18} />}
            <span className="hidden md:inline">{isDarkMode ? 'Light Mode' : 'Dark Mode'}</span>
          </button>
          <button className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-[var(--text-muted)] hover:text-[var(--text-main)] hover:bg-[var(--border)] transition text-sm">
            <Settings size={18} />
            <span className="hidden md:inline">Settings</span>
          </button>
        </div>
      </aside>

      {/* MAIN LAYOUT WRAPPER (COLUMNS 2 & 3) */}
      <main className="flex flex-1 flex-col md:flex-row overflow-hidden bg-[var(--background)]">
        
        {/* COLUMN 2: ACTIVE LECTURE & CANVAS WORKSPACE */}
        <section className="flex flex-1 flex-col p-6 overflow-y-auto space-y-6 border-r border-[var(--border)]">
          
          {/* Universal URL Dropzone */}
          <div className="flex gap-2 bg-[var(--panel-bg)] p-1.5 rounded-2xl border border-[var(--border)] shadow-sm">
            <input 
              type="text" 
              placeholder="Drop any educational lecture link here (YouTube)..." 
              className="flex-1 bg-transparent px-4 py-2.5 text-sm outline-none text-[var(--text-main)] placeholder-[var(--text-muted)]"
              value={videoUrl}
              onChange={(e) => setVideoUrl(e.target.value)}
            />
            <button 
              onClick={() => videoUrl && setIsLoaded(true)}
              className="rounded-xl bg-[#0066FF] px-5 py-2 text-sm font-semibold text-white hover:bg-opacity-90 transition shadow-sm"
            >
              Analyze
            </button>
          </div>

          {/* The Unified Interruption Player Stage */}
          <div className="relative flex-1 min-h-[350px] rounded-2xl border border-[var(--border)] bg-[var(--panel-bg)] overflow-hidden flex items-center justify-center group shadow-inner">
            {isLoaded ? (
              <div className="relative w-full h-full">
                {/* Micro-Annotation layer wrapper */}
                <CanvasLayer />
                <iframe 
                  className="w-full h-full absolute inset-0"
                  src={`https://www.youtube.com/embed/${videoUrl.split('v=')[1] || ''}?enablejsapi=1`}
                  title="Study Engine Player"
                  allow="autoplay; encrypted-media"
                />
              </div>
            ) : (
              <div className="text-center max-w-sm p-6 space-y-4">
                <div className="mx-auto h-12 w-12 rounded-2xl bg-blue-500/10 flex items-center justify-center text-[#0066FF]">
                  <Video size={24} />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-[var(--text-main)]">Awaiting Session Source</h3>
                  <p className="text-xs text-[var(--text-muted)] mt-1">Paste a video link above. The Pause & Probe system will map concept nodes over the timeline automatically.</p>
                </div>
              </div>
            )}
          </div>
        </section>

        {/* COLUMN 3: CONTEXTUAL AI COPILOT */}
        <aside className="w-full md:w-80 lg:w-96 border-l border-[var(--border)] bg-[var(--panel-bg)] flex flex-col justify-between transition-all">
          
          {/* Prompt Engine Controller */}
          <div className="p-4 border-b border-[var(--border)] space-y-3">
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)]">
              <Sparkles size={14} className="text-[#0066FF]" />
              <span>Instant Scaffolding</span>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <button onClick={() => applyMacroPrompt('kid')} className="flex items-center gap-2 rounded-xl border border-[var(--border)] bg-[var(--background)] p-2 text-left text-xs font-medium hover:border-[#0066FF] transition text-[var(--text-main)]">
                👶 <span>10yo Analogy</span>
              </button>
              <button onClick={() => applyMacroPrompt('examples')} className="flex items-center gap-2 rounded-xl border border-[var(--border)] bg-[var(--background)] p-2 text-left text-xs font-medium hover:border-[#0066FF] transition text-[var(--text-main)]">
                💡 <span>Intuitive Example</span>
              </button>
              <button onClick={() => applyMacroPrompt('quiz')} className="flex items-center gap-2 rounded-xl border border-[var(--border)] bg-[var(--background)] p-2 text-left text-xs font-medium hover:border-[#0066FF] transition text-[var(--text-main)]">
                ❓ <span>Probe Mode</span>
              </button>
              <button onClick={() => applyMacroPrompt('sheet')} className="flex items-center gap-2 rounded-xl border border-[var(--border)] bg-[var(--background)] p-2 text-left text-xs font-medium hover:border-[#0066FF] transition text-[var(--text-main)]">
                📊 <span>Cheat Sheet</span>
              </button>
            </div>
          </div>

          {/* Active Chat Timeline */}
          <div className="flex-1 p-4 overflow-y-auto space-y-4 text-sm">
            <div className="rounded-2xl bg-[var(--background)] border border-[var(--border)] p-3.5 space-y-1">
              <p className="text-xs font-semibold text-[#0066FF]">Prep Helper AI</p>
              <p className="text-[var(--text-main)] text-xs leading-relaxed">
                Provide a session lecture link. I am ready to monitor the transcript to stop the loop for interactive active recall.
              </p>
            </div>
          </div>

          {/* Chat / Voice Capture Interface */}
          <div className="p-4 bg-[var(--background)] border-t border-[var(--border)]">
            <div className="flex items-center gap-2 bg-[var(--panel-bg)] border border-[var(--border)] rounded-xl p-1.5 focus-within:border-[#0066FF] transition">
              <textarea 
                rows={1}
                placeholder="Ask about this timestamp..."
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                className="flex-1 bg-transparent px-3 py-1.5 text-xs outline-none resize-none text-[var(--text-main)] placeholder-[var(--text-muted)]"
              />
              <div className="flex items-center gap-1">
                <button className="p-2 rounded-lg text-[var(--text-muted)] hover:text-[var(--text-main)] hover:bg-[var(--border)] transition">
                  <Mic size={16} />
                </button>
                <button className="p-2 rounded-lg bg-[#0066FF] text-white hover:bg-opacity-90 transition">
                  <Send size={14} />
                </button>
              </div>
            </div>
          </div>
        </aside>
      </main>
    </div>
  );
}
