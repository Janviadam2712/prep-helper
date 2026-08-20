'use client';
import { useEffect, useRef, useState, useCallback } from 'react';

// Minimal YouTube IFrame API types — avoids pulling in @types/youtube
// just for this. window.YT is injected by the script we load below.
declare global {
  interface Window {
    YT: any;
    onYouTubeIframeAPIReady: () => void;
  }
}

let apiLoadPromise: Promise<void> | null = null;

// The YouTube IFrame API script is global and should only be injected once,
// even if multiple components on the page try to use a player.
function loadYouTubeAPI(): Promise<void> {
  if (apiLoadPromise) return apiLoadPromise;

  apiLoadPromise = new Promise((resolve) => {
    if (window.YT && window.YT.Player) {
      resolve();
      return;
    }
    const existing = document.getElementById('youtube-iframe-api');
    if (!existing) {
      const script = document.createElement('script');
      script.id = 'youtube-iframe-api';
      script.src = 'https://www.youtube.com/iframe_api';
      document.body.appendChild(script);
    }
    // YouTube calls this global function automatically once its API is ready.
    // If something else on the page already set this, we chain onto it
    // rather than silently overwrite it.
    const prev = window.onYouTubeIframeAPIReady;
    window.onYouTubeIframeAPIReady = () => {
      if (typeof prev === 'function') prev();
      resolve();
    };
  });

  return apiLoadPromise;
}

export type PlayerState = 'unstarted' | 'ended' | 'playing' | 'paused' | 'buffering' | 'cued';

const STATE_MAP: Record<number, PlayerState> = {
  [-1]: 'unstarted',
  0: 'ended',
  1: 'playing',
  2: 'paused',
  3: 'buffering',
  5: 'cued',
};

const POLL_INTERVAL_MS = 2000;

/**
 * Mounts a real, JS-controllable YouTube player into the element pointed to
 * by `containerRef`, and polls its current timestamp every 2 seconds.
 *
 * This polling is the foundation for Pause & Probe: a later piece will
 * compare `currentTime` against AI-identified concept timestamps and call
 * `pause()` + trigger a question at the right moment. This hook does NOT
 * do that decision-making itself — it only exposes playback state/control.
 */
export function useYouTubePlayer(videoId: string) {
  const containerRef = useRef<HTMLDivElement>(null);
  const playerRef = useRef<any>(null);
  const pollRef = useRef<number | null>(null);

  const [isReady, setIsReady] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [playerState, setPlayerState] = useState<PlayerState>('unstarted');

  useEffect(() => {
    if (!videoId || !containerRef.current) return;
    let destroyed = false;

    setIsReady(false);
    setCurrentTime(0);
    setDuration(0);

    loadYouTubeAPI().then(() => {
      if (destroyed || !containerRef.current) return;

      playerRef.current = new window.YT.Player(containerRef.current, {
        videoId,
        playerVars: { rel: 0, modestbranding: 1 },
        events: {
          onReady: () => {
            if (destroyed) return;
            setIsReady(true);
            setDuration(playerRef.current?.getDuration?.() || 0);
          },
          onStateChange: (e: { data: number }) => {
            if (destroyed) return;
            setPlayerState(STATE_MAP[e.data] ?? 'unstarted');
          },
        },
      });
    });

    return () => {
      destroyed = true;
      if (pollRef.current) window.clearInterval(pollRef.current);
      if (playerRef.current?.destroy) {
        try { playerRef.current.destroy(); } catch { /* player already gone */ }
      }
      playerRef.current = null;
      setIsReady(false);
    };
    // Re-run whenever the video changes — a new videoId means a new player.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [videoId]);

  useEffect(() => {
    if (!isReady) return;
    pollRef.current = window.setInterval(() => {
      const t = playerRef.current?.getCurrentTime?.();
      if (typeof t === 'number') setCurrentTime(t);
    }, POLL_INTERVAL_MS);
    return () => {
      if (pollRef.current) window.clearInterval(pollRef.current);
    };
  }, [isReady]);

  const play = useCallback(() => playerRef.current?.playVideo?.(), []);
  const pause = useCallback(() => playerRef.current?.pauseVideo?.(), []);
  const seekTo = useCallback((seconds: number) => playerRef.current?.seekTo?.(seconds, true), []);

  return { containerRef, isReady, currentTime, duration, playerState, play, pause, seekTo };
}