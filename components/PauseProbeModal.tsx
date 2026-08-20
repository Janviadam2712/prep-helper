'use client';
import { useState } from 'react';
import type { ConceptCheckpoint } from '../app/api/analyze/route';

type PauseProbeModalProps = {
  checkpoint: ConceptCheckpoint;
  onResume: () => void; // called when the student is allowed to continue the video
};

export default function PauseProbeModal({ checkpoint, onResume }: PauseProbeModalProps) {
  const [selected, setSelected]   = useState<number | null>(null);
  const [submitted, setSubmitted] = useState(false);
  const [attempt, setAttempt]     = useState<1 | 2>(1);

  const isCorrect = selected === checkpoint.correctIndex;
  // Once they've used their one retry, they can continue regardless of
  // whether the second attempt was right — per the agreed flow: explanation
  // shown immediately on a wrong answer, one retry allowed, then unlocked.
  const canContinue = submitted && (isCorrect || attempt === 2);

  const handleSubmit = () => {
    if (selected === null) return;
    setSubmitted(true);
  };

  const handleRetry = () => {
    setAttempt(2);
    setSelected(null);
    setSubmitted(false);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ backgroundColor: 'rgba(7,7,26,0.85)', backdropFilter: 'blur(6px)', padding: '20px' }}
    >
      <div
        className="surface-panel"
        style={{ width: '100%', maxWidth: '480px', borderRadius: '20px', padding: '28px', boxShadow: 'var(--shadow-lg)' }}
      >
        <div className="flex items-center gap-2" style={{ marginBottom: '18px' }}>
          <span className="brand-gradient-bg" style={{ width: '8px', height: '8px', borderRadius: '99px', display: 'inline-block' }} />
          <p style={{ fontSize: '11px', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--text-faint)' }}>
            Pause &amp; Probe — Concept Check
          </p>
        </div>

        <p style={{ fontSize: '16px', fontWeight: 700, color: 'var(--text-main)', lineHeight: 1.5, marginBottom: '20px' }}>
          {checkpoint.question}
        </p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: submitted ? '18px' : '24px' }}>
          {checkpoint.options.map((option, i) => {
            const isSelected = selected === i;
            const isAnswerCorrect = i === checkpoint.correctIndex;
            // After submission, highlight correct/incorrect clearly —
            // this is what makes the explanation feel immediate, not delayed.
            let borderColor = 'var(--border)';
            let bg = 'var(--surface-raised)';
            if (submitted) {
              if (isAnswerCorrect) { borderColor = '#00E5A0'; bg = 'rgba(0,229,160,0.10)'; }
              else if (isSelected) { borderColor = '#FF5060'; bg = 'rgba(255,80,96,0.10)'; }
            } else if (isSelected) {
              borderColor = '#6C47FF';
              bg = 'rgba(108,71,255,0.10)';
            }

            return (
              <button
                key={i}
                onClick={() => !submitted && setSelected(i)}
                disabled={submitted}
                className="text-left transition-all duration-150"
                style={{
                  padding: '12px 14px',
                  borderRadius: '12px',
                  border: `1.5px solid ${borderColor}`,
                  backgroundColor: bg,
                  cursor: submitted ? 'default' : 'pointer',
                  fontSize: '13.5px',
                  fontWeight: 600,
                  color: 'var(--text-main)',
                }}
              >
                <span style={{ color: 'var(--text-faint)', marginRight: '8px' }}>{['A', 'B', 'C', 'D'][i]}.</span>
                {option}
              </button>
            );
          })}
        </div>

        {submitted && (
          <div
            style={{
              padding: '14px 16px',
              borderRadius: '12px',
              backgroundColor: isCorrect ? 'rgba(0,229,160,0.08)' : 'rgba(255,80,96,0.08)',
              border: `1px solid ${isCorrect ? 'rgba(0,229,160,0.25)' : 'rgba(255,80,96,0.25)'}`,
              marginBottom: '20px',
            }}
          >
            <p style={{ fontSize: '12.5px', fontWeight: 700, color: isCorrect ? '#00E5A0' : '#FF5060', marginBottom: '6px' }}>
              {isCorrect ? '✓ Correct' : attempt === 1 ? '✗ Not quite' : '✗ Still not quite — here\'s the explanation'}
            </p>
            <p style={{ fontSize: '13px', color: 'var(--text-muted)', lineHeight: 1.6 }}>
              {checkpoint.explanation}
            </p>
          </div>
        )}

        <div className="flex justify-end gap-2">
          {!submitted && (
            <button
              onClick={handleSubmit}
              disabled={selected === null}
              className="btn-primary disabled:opacity-40 disabled:cursor-not-allowed"
              style={{ borderRadius: '10px', padding: '10px 20px', fontSize: '13px' }}
            >
              Submit Answer
            </button>
          )}

          {submitted && !canContinue && (
            <button
              onClick={handleRetry}
              className="btn-primary"
              style={{ borderRadius: '10px', padding: '10px 20px', fontSize: '13px' }}
            >
              Try Once More
            </button>
          )}

          {canContinue && (
            <button
              onClick={onResume}
              className="btn-primary"
              style={{ borderRadius: '10px', padding: '10px 20px', fontSize: '13px' }}
            >
              Continue Video →
            </button>
          )}
        </div>
      </div>
    </div>
  );
}