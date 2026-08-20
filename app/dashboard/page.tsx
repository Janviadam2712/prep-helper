'use client';
import { useState } from 'react';
import Sidebar from '../../components/Sidebar';
import Workspace from '../../components/Workspace';
import AIChatPanel from '../../components/AIChatPanel';

export default function Dashboard() {
  const [darkMode,      setDarkMode]      = useState(true);
  const [sidebarOpen,   setSidebarOpen]   = useState(true);
  const [activeSubject, setActiveSubject] = useState('Physics');
  const [transcript,    setTranscript]    = useState('');

  return (
    // Dark is the unconditional default in globals.css (:root).
    // 'light' is the ONLY opt-in override class — there is no '.dark' rule
    // to apply anymore, so we only ever add a class when darkMode is FALSE.
    <div className={darkMode ? '' : 'light'}>
      <div className="flex h-screen overflow-hidden"
        style={{ backgroundColor: 'var(--background)' }}>
        {sidebarOpen && (
          <div
            className="fixed inset-0 bg-black/40 z-10 hide-desktop"
            onClick={() => setSidebarOpen(false)}
          />
        )}
        <Sidebar
          open={sidebarOpen}
          onToggle={() => setSidebarOpen(!sidebarOpen)}
          activeSubject={activeSubject}
          onSubjectChange={setActiveSubject}
        />
        <Workspace onTranscriptLoaded={setTranscript} />
        <AIChatPanel
          darkMode={darkMode}
          onToggleDark={() => setDarkMode(!darkMode)}
          transcript={transcript}
          activeSubject={activeSubject}
        />
      </div>
    </div>
  );
}