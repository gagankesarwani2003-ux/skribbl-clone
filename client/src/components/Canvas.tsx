import React, { useRef, useEffect, useState, useCallback } from 'react';
import { StrokeData, Point } from '../types';
import { socket } from '../services/socket';
import {
  Paintbrush,
  Eraser,
  PaintBucket,
  RotateCcw,
  Trash2,
  Minus,
  CircleDot
} from 'lucide-react';
import { sound } from '../services/audio';

interface CanvasProps {
  isDrawer: boolean;
  drawerId: string | null;
}

const BRUSH_SIZES = [
  { label: 'Thin', size: 3 },
  { label: 'Medium', size: 8 },
  { label: 'Thick', size: 16 },
  { label: 'Huge', size: 28 },
];

const COLOR_PALETTE = [
  '#000000', '#ffffff', '#64748b', '#ef4444', '#f97316',
  '#f59e0b', '#84cc16', '#10b981', '#06b6d4', '#3b82f6',
  '#8b5cf6', '#ec4899', '#78350f', '#991b1b', '#1e3a8a'
];

export const Canvas: React.FC<CanvasProps> = ({ isDrawer, drawerId }) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  const [tool, setTool] = useState<'brush' | 'eraser' | 'bucket'>('brush');
  const [color, setColor] = useState<string>('#000000');
  const [brushSize, setBrushSize] = useState<number>(6);
  const [isDrawing, setIsDrawing] = useState<boolean>(false);

  // Local stroke points buffer during active mouse drag
  const currentPointsRef = useRef<Point[]>([]);
  // Full stroke history for replay
  const strokesRef = useRef<StrokeData[]>([]);

  // Redraw all strokes onto canvas
  const redrawCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;

    // Reset background to solid white
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, width, height);

    // Render all saved strokes
    strokesRef.current.forEach((stroke) => {
      renderStroke(ctx, stroke, width, height);
    });
  }, []);

  // Helper to render a single stroke
  const renderStroke = (
    ctx: CanvasRenderingContext2D,
    stroke: StrokeData,
    width: number,
    height: number
  ) => {
    if (stroke.type === 'clear') {
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, width, height);
      return;
    }

    if (stroke.type === 'flood_fill' && stroke.points.length > 0) {
      const p = stroke.points[0];
      floodFill(ctx, Math.floor(p.x * width), Math.floor(p.y * height), stroke.color, width, height);
      return;
    }

    if (stroke.points.length === 0) return;

    ctx.save();
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.strokeStyle = stroke.color;
    ctx.lineWidth = stroke.size;

    if (stroke.points.length === 1) {
      // Single dot
      const pt = stroke.points[0];
      ctx.beginPath();
      ctx.arc(pt.x * width, pt.y * height, stroke.size / 2, 0, Math.PI * 2);
      ctx.fillStyle = stroke.color;
      ctx.fill();
    } else {
      ctx.beginPath();
      const first = stroke.points[0];
      ctx.moveTo(first.x * width, first.y * height);

      for (let i = 1; i < stroke.points.length - 1; i++) {
        const xc = ((stroke.points[i].x + stroke.points[i + 1].x) / 2) * width;
        const yc = ((stroke.points[i].y + stroke.points[i + 1].y) / 2) * height;
        ctx.quadraticCurveTo(stroke.points[i].x * width, stroke.points[i].y * height, xc, yc);
      }

      const last = stroke.points[stroke.points.length - 1];
      ctx.lineTo(last.x * width, last.y * height);
      ctx.stroke();
    }

    ctx.restore();
  };

  // BFS Flood Fill Algorithm
  const floodFill = (
    ctx: CanvasRenderingContext2D,
    startX: number,
    startY: number,
    fillColorHex: string,
    width: number,
    height: number
  ) => {
    if (startX < 0 || startX >= width || startY < 0 || startY >= height) return;

    const imgData = ctx.getImageData(0, 0, width, height);
    const data = imgData.data;

    // Convert hex to RGBA
    const fillR = parseInt(fillColorHex.slice(1, 3), 16) || 0;
    const fillG = parseInt(fillColorHex.slice(3, 5), 16) || 0;
    const fillB = parseInt(fillColorHex.slice(5, 7), 16) || 0;
    const fillA = 255;

    const startIndex = (startY * width + startX) * 4;
    const targetR = data[startIndex];
    const targetG = data[startIndex + 1];
    const targetB = data[startIndex + 2];
    const targetA = data[startIndex + 3];

    // If already the same color, skip
    if (
      Math.abs(targetR - fillR) < 5 &&
      Math.abs(targetG - fillG) < 5 &&
      Math.abs(targetB - fillB) < 5 &&
      Math.abs(targetA - fillA) < 5
    ) {
      return;
    }

    const matchTarget = (idx: number) => {
      return (
        Math.abs(data[idx] - targetR) < 32 &&
        Math.abs(data[idx + 1] - targetG) < 32 &&
        Math.abs(data[idx + 2] - targetB) < 32 &&
        Math.abs(data[idx + 3] - targetA) < 32
      );
    };

    const queue: number[] = [startX, startY];
    const visited = new Uint8Array(width * height);
    visited[startY * width + startX] = 1;

    let head = 0;
    while (head < queue.length) {
      const x = queue[head++];
      const y = queue[head++];
      const idx = (y * width + x) * 4;

      data[idx] = fillR;
      data[idx + 1] = fillG;
      data[idx + 2] = fillB;
      data[idx + 3] = fillA;

      const neighbors = [
        [x + 1, y],
        [x - 1, y],
        [x, y + 1],
        [x, y - 1],
      ];

      for (let i = 0; i < 4; i++) {
        const nx = neighbors[i][0];
        const ny = neighbors[i][1];
        if (nx >= 0 && nx < width && ny >= 0 && ny < height) {
          const vIdx = ny * width + nx;
          if (!visited[vIdx]) {
            visited[vIdx] = 1;
            const nIdx = vIdx * 4;
            if (matchTarget(nIdx)) {
              queue.push(nx, ny);
            }
          }
        }
      }
    }

    ctx.putImageData(imgData, 0, 0);
  };

  // Adjust canvas resolution dynamically on window resize
  useEffect(() => {
    const handleResize = () => {
      const canvas = canvasRef.current;
      const container = containerRef.current;
      if (!canvas || !container) return;

      const rect = container.getBoundingClientRect();
      // Keep 16:10 or 4:3 aspect ratio
      const w = Math.floor(rect.width);
      const h = Math.floor(rect.height);

      if (canvas.width !== w || canvas.height !== h) {
        canvas.width = w;
        canvas.height = h;
        redrawCanvas();
      }
    };

    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [redrawCanvas]);

  // Setup Socket Listeners
  useEffect(() => {
    // 1. Live stroke stream from drawer
    const handleDrawData = (stroke: StrokeData) => {
      strokesRef.current.push(stroke);
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      renderStroke(ctx, stroke, canvas.width, canvas.height);
    };

    // 2. Undo stroke
    const handleUndo = (data: { history: StrokeData[] }) => {
      strokesRef.current = data.history || [];
      redrawCanvas();
    };

    // 3. Clear canvas
    const handleClear = () => {
      strokesRef.current = [];
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
      }
    };

    // 4. Batch history sync (on join or round change)
    const handleHistory = (data: { history: StrokeData[] }) => {
      strokesRef.current = data.history || [];
      redrawCanvas();
    };

    socket.on('draw_data', handleDrawData);
    socket.on('draw_undo', handleUndo);
    socket.on('canvas_clear', handleClear);
    socket.on('draw_history', handleHistory);

    // Request initial history
    socket.emit('request_stroke_history');

    return () => {
      socket.off('draw_data', handleDrawData);
      socket.off('draw_undo', handleUndo);
      socket.off('canvas_clear', handleClear);
      socket.off('draw_history', handleHistory);
    };
  }, [redrawCanvas]);

  // Normalized coordinate helper
  const getCoordinates = (
    e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>
  ): Point | null => {
    const canvas = canvasRef.current;
    if (!canvas) return null;
    const rect = canvas.getBoundingClientRect();

    let clientX = 0;
    let clientY = 0;

    if ('touches' in e) {
      if (e.touches.length === 0) return null;
      clientX = e.touches[0].clientX;
      clientY = e.touches[0].clientY;
    } else {
      clientX = e.clientX;
      clientY = e.clientY;
    }

    const x = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
    const y = Math.max(0, Math.min(1, (clientY - rect.top) / rect.height));

    return { x, y };
  };

  // Drawing event handlers (Active Drawer only)
  const handleStart = (
    e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>
  ) => {
    if (!isDrawer) return;
    const pt = getCoordinates(e);
    if (!pt) return;

    if (tool === 'bucket') {
      sound.playClick();
      const stroke: StrokeData = {
        id: `fill_${Date.now()}`,
        type: 'flood_fill',
        color,
        size: 0,
        points: [pt],
        drawerId: drawerId || ''
      };
      socket.emit('draw_data', stroke);
      return;
    }

    setIsDrawing(true);
    currentPointsRef.current = [pt];

    // Emit initial dot
    const strokeColor = tool === 'eraser' ? '#ffffff' : color;
    const stroke: StrokeData = {
      id: `stroke_${Date.now()}_${Math.random()}`,
      type: 'brush',
      color: strokeColor,
      size: brushSize,
      points: [pt],
      drawerId: drawerId || ''
    };
    socket.emit('draw_data', stroke);
  };

  const handleMove = (
    e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>
  ) => {
    if (!isDrawer || !isDrawing || tool === 'bucket') return;
    const pt = getCoordinates(e);
    if (!pt) return;

    currentPointsRef.current.push(pt);

    // Batch emit points every 2-3 points or small intervals for low latency
    if (currentPointsRef.current.length >= 3) {
      const pointsToEmit = [...currentPointsRef.current];
      // Keep last point for smooth continuity
      currentPointsRef.current = [pointsToEmit[pointsToEmit.length - 1]];

      const strokeColor = tool === 'eraser' ? '#ffffff' : color;
      const stroke: StrokeData = {
        id: `stroke_${Date.now()}_${Math.random()}`,
        type: 'brush',
        color: strokeColor,
        size: brushSize,
        points: pointsToEmit,
        drawerId: drawerId || ''
      };

      socket.emit('draw_data', stroke);
    }
  };

  const handleEnd = () => {
    if (!isDrawer || !isDrawing) return;
    setIsDrawing(false);

    if (currentPointsRef.current.length > 1) {
      const strokeColor = tool === 'eraser' ? '#ffffff' : color;
      const stroke: StrokeData = {
        id: `stroke_${Date.now()}_${Math.random()}`,
        type: 'brush',
        color: strokeColor,
        size: brushSize,
        points: currentPointsRef.current,
        drawerId: drawerId || ''
      };
      socket.emit('draw_data', stroke);
    }
    currentPointsRef.current = [];
  };

  const handleUndoClick = () => {
    if (!isDrawer) return;
    sound.playClick();
    socket.emit('draw_undo');
  };

  const handleClearClick = () => {
    if (!isDrawer) return;
    sound.playClick();
    socket.emit('canvas_clear');
  };

  return (
    <div className="flex flex-col h-full w-full bg-slate-900 select-none">
      {/* Canvas Viewport */}
      <div
        ref={containerRef}
        className="relative flex-1 bg-white rounded-t-xl overflow-hidden shadow-inner cursor-crosshair border-b border-slate-700"
      >
        <canvas
          ref={canvasRef}
          onMouseDown={handleStart}
          onMouseMove={handleMove}
          onMouseUp={handleEnd}
          onMouseLeave={handleEnd}
          onTouchStart={handleStart}
          onTouchMove={handleMove}
          onTouchEnd={handleEnd}
          className="w-full h-full block touch-none"
        />

        {!isDrawer && (
          <div className="absolute top-3 left-3 bg-slate-900/80 backdrop-blur-md px-3 py-1 rounded-full text-xs font-semibold text-slate-300 pointer-events-none flex items-center gap-1.5 shadow-md">
            <span className="w-2 h-2 rounded-full bg-indigo-500 animate-pulse" />
            Drawer is drawing...
          </div>
        )}
      </div>

      {/* Drawer Toolbar */}
      {isDrawer ? (
        <div className="bg-slate-800 p-2 sm:p-3 rounded-b-xl border border-t-0 border-slate-700 flex flex-wrap items-center justify-between gap-3 shadow-lg">
          {/* Tool selectors */}
          <div className="flex items-center gap-1 sm:gap-1.5 bg-slate-900/60 p-1 rounded-xl">
            <button
              onClick={() => {
                sound.playClick();
                setTool('brush');
              }}
              className={`p-2 rounded-lg transition ${
                tool === 'brush'
                  ? 'bg-indigo-600 text-white shadow'
                  : 'text-slate-400 hover:text-white hover:bg-slate-700/60'
              }`}
              title="Brush / Pen"
            >
              <Paintbrush size={18} />
            </button>
            <button
              onClick={() => {
                sound.playClick();
                setTool('bucket');
              }}
              className={`p-2 rounded-lg transition ${
                tool === 'bucket'
                  ? 'bg-indigo-600 text-white shadow'
                  : 'text-slate-400 hover:text-white hover:bg-slate-700/60'
              }`}
              title="Fill Bucket"
            >
              <PaintBucket size={18} />
            </button>
            <button
              onClick={() => {
                sound.playClick();
                setTool('eraser');
              }}
              className={`p-2 rounded-lg transition ${
                tool === 'eraser'
                  ? 'bg-indigo-600 text-white shadow'
                  : 'text-slate-400 hover:text-white hover:bg-slate-700/60'
              }`}
              title="Eraser"
            >
              <Eraser size={18} />
            </button>
          </div>

          {/* Brush Sizes */}
          <div className="flex items-center gap-1 bg-slate-900/60 p-1 rounded-xl">
            {BRUSH_SIZES.map((b) => (
              <button
                key={b.size}
                onClick={() => {
                  sound.playClick();
                  setBrushSize(b.size);
                }}
                className={`p-1.5 rounded-lg flex items-center justify-center transition ${
                  brushSize === b.size
                    ? 'bg-slate-700 text-white ring-2 ring-indigo-500'
                    : 'text-slate-400 hover:text-white'
                }`}
                title={`${b.label} (${b.size}px)`}
              >
                <div
                  className="rounded-full bg-current"
                  style={{ width: Math.min(20, Math.max(4, b.size)), height: Math.min(20, Math.max(4, b.size)) }}
                />
              </button>
            ))}
          </div>

          {/* Color Palette */}
          <div className="flex items-center gap-1 bg-slate-900/60 p-1.5 rounded-xl flex-wrap max-w-xs">
            {COLOR_PALETTE.map((c) => (
              <button
                key={c}
                onClick={() => {
                  sound.playClick();
                  setColor(c);
                  if (tool === 'eraser') setTool('brush');
                }}
                style={{ backgroundColor: c }}
                className={`w-5 h-5 rounded-md border transition-transform ${
                  color === c && tool !== 'eraser'
                    ? 'border-white scale-125 shadow-md z-10 ring-2 ring-indigo-400'
                    : 'border-slate-600 hover:scale-110'
                }`}
              />
            ))}
            {/* Custom color picker */}
            <label className="relative cursor-pointer">
              <input
                type="color"
                value={color}
                onChange={(e) => {
                  setColor(e.target.value);
                  if (tool === 'eraser') setTool('brush');
                }}
                className="opacity-0 absolute inset-0 w-full h-full cursor-pointer"
              />
              <div
                className="w-5 h-5 rounded-md border border-dashed border-slate-400 flex items-center justify-center text-[10px] font-bold text-slate-300 hover:scale-110 transition-transform"
                title="Custom color"
              >
                +
              </div>
            </label>
          </div>

          {/* Action buttons (Undo & Clear) */}
          <div className="flex items-center gap-1.5">
            <button
              onClick={handleUndoClick}
              className="p-2 bg-slate-700 hover:bg-slate-600 active:scale-95 text-slate-200 hover:text-white rounded-xl transition flex items-center gap-1 text-xs font-semibold shadow"
              title="Undo last stroke"
            >
              <RotateCcw size={16} />
              <span className="hidden sm:inline">Undo</span>
            </button>
            <button
              onClick={handleClearClick}
              className="p-2 bg-rose-600/80 hover:bg-rose-600 active:scale-95 text-white rounded-xl transition flex items-center gap-1 text-xs font-semibold shadow"
              title="Clear canvas"
            >
              <Trash2 size={16} />
              <span className="hidden sm:inline">Clear</span>
            </button>
          </div>
        </div>
      ) : (
        <div className="bg-slate-800/90 py-2.5 px-4 rounded-b-xl border border-t-0 border-slate-700 text-center text-xs text-slate-400 font-medium">
          Type your guesses in the chat box on the right! 💬
        </div>
      )}
    </div>
  );
};
