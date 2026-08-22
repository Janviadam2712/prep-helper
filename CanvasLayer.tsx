'use client';

import React, { useRef, useEffect, useState } from 'react';

export const CanvasLayer = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [activeTool, setActiveTool] = useState<'pen' | 'highlighter'>('pen');

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const syncCanvasDimensions = () => {
      canvas.width = canvas.parentElement?.clientWidth || 800;
      canvas.height = canvas.parentElement?.clientHeight || 450;
    };

    syncCanvasDimensions();
    window.addEventListener('resize', syncCanvasDimensions);
    return () => window.removeEventListener('resize', syncCanvasDimensions);
  }, []);

  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement>) => {
    setIsDrawing(true);
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;

    ctx.beginPath();
    ctx.moveTo(e.nativeEvent.offsetX, e.nativeEvent.offsetY);
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;

    // Use unified precise system colors
    ctx.lineWidth = activeTool === 'highlighter' ? 24 : 2.5;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.strokeStyle = activeTool === 'highlighter' ? 'rgba(0, 209, 255, 0.25)' : '#0066FF';

    ctx.lineTo(e.nativeEvent.offsetX, e.nativeEvent.offsetY);
    ctx.stroke();
  };

  return (
    <div className="absolute inset-0 z-10 pointer-events-auto">
      {/* Absolute Canvas Floating controls toolbar */}
      <div className="absolute top-4 left-4 z-20 flex gap-1.5 bg-[var(--background)] p-1 rounded-xl shadow-md border border-[var(--border)]">
        <button 
          onClick={() => setActiveTool('pen')} 
          className={`px-3 py-1.5 rounded-lg text-xs font-medium transition ${activeTool === 'pen' ? 'bg-[#0066FF] text-white' : 'text-[var(--text-muted)] hover:bg-[var(--panel-bg)]'}`}
        >
          🖊️ Pen
        </button>
        <button 
          onClick={() => setActiveTool('highlighter')} 
          className={`px-3 py-1.5 rounded-lg text-xs font-medium transition ${activeTool === 'highlighter' ? 'bg-cyan-500/20 text-cyan-600 dark:text-cyan-400' : 'text-[var(--text-muted)] hover:bg-[var(--panel-bg)]'}`}
        >
          🖍️ Highlight
        </button>
        <button 
          onClick={() => {
            const ctx = canvasRef.current?.getContext('2d');
            if (canvasRef.current) ctx?.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
          }} 
          className="px-3 py-1.5 rounded-lg text-xs font-medium text-rose-500 hover:bg-rose-500/10 transition"
        >
          Clear
        </button>
      </div>
      
      <canvas 
        ref={canvasRef} 
        onMouseDown={startDrawing} 
        onMouseUp={() => setIsDrawing(false)} 
        onMouseLeave={() => setIsDrawing(false)} 
        onMouseMove={draw} 
        className="absolute top-0 left-0 w-full h-full cursor-crosshair bg-transparent"
      />
    </div>
  );
};