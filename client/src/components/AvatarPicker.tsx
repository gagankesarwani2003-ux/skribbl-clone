import React from 'react';
import { PlayerAvatar } from '../types';
import { Avatar } from './Avatar';
import { ChevronLeft, ChevronRight, Shuffle } from 'lucide-react';
import { sound } from '../services/audio';

interface AvatarPickerProps {
  avatar: PlayerAvatar;
  onChange: (avatar: PlayerAvatar) => void;
}

const PALETTE = [
  '#3b82f6', // blue
  '#10b981', // green
  '#f59e0b', // amber
  '#ec4899', // pink
  '#8b5cf6', // purple
  '#ef4444', // red
  '#06b6d4', // cyan
  '#f97316', // orange
  '#84cc16', // lime
  '#e2e8f0', // ghost white
];

export const AvatarPicker: React.FC<AvatarPickerProps> = ({ avatar, onChange }) => {
  const nextEyes = () => {
    sound.playClick();
    onChange({ ...avatar, eyes: (avatar.eyes + 1) % 6 });
  };

  const prevEyes = () => {
    sound.playClick();
    onChange({ ...avatar, eyes: (avatar.eyes - 1 + 6) % 6 });
  };

  const nextMouth = () => {
    sound.playClick();
    onChange({ ...avatar, mouth: (avatar.mouth + 1) % 6 });
  };

  const prevMouth = () => {
    sound.playClick();
    onChange({ ...avatar, mouth: (avatar.mouth - 1 + 6) % 6 });
  };

  const randomize = () => {
    sound.playClick();
    onChange({
      color: PALETTE[Math.floor(Math.random() * PALETTE.length)],
      eyes: Math.floor(Math.random() * 6),
      mouth: Math.floor(Math.random() * 6),
    });
  };

  return (
    <div className="flex flex-col items-center bg-slate-800/80 p-5 rounded-2xl border border-slate-700 shadow-xl backdrop-blur-md">
      {/* Avatar Preview */}
      <div className="relative group mb-4">
        <div className="p-3 bg-slate-900 rounded-full border-2 border-indigo-500/40 shadow-inner">
          <Avatar avatar={avatar} size={108} />
        </div>
        <button
          onClick={randomize}
          className="absolute -bottom-1 -right-1 p-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-full shadow-lg transition-transform active:scale-95"
          title="Randomize avatar"
        >
          <Shuffle size={16} />
        </button>
      </div>

      {/* Eyes & Mouth Selectors */}
      <div className="w-full space-y-2 mb-4">
        <div className="flex items-center justify-between bg-slate-900/70 px-3 py-1.5 rounded-xl border border-slate-700/60">
          <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Eyes</span>
          <div className="flex items-center gap-2">
            <button
              onClick={prevEyes}
              className="p-1 hover:bg-slate-800 text-slate-300 hover:text-white rounded transition"
            >
              <ChevronLeft size={16} />
            </button>
            <span className="text-xs font-bold text-slate-200 w-4 text-center">{avatar.eyes + 1}</span>
            <button
              onClick={nextEyes}
              className="p-1 hover:bg-slate-800 text-slate-300 hover:text-white rounded transition"
            >
              <ChevronRight size={16} />
            </button>
          </div>
        </div>

        <div className="flex items-center justify-between bg-slate-900/70 px-3 py-1.5 rounded-xl border border-slate-700/60">
          <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Mouth</span>
          <div className="flex items-center gap-2">
            <button
              onClick={prevMouth}
              className="p-1 hover:bg-slate-800 text-slate-300 hover:text-white rounded transition"
            >
              <ChevronLeft size={16} />
            </button>
            <span className="text-xs font-bold text-slate-200 w-4 text-center">{avatar.mouth + 1}</span>
            <button
              onClick={nextMouth}
              className="p-1 hover:bg-slate-800 text-slate-300 hover:text-white rounded transition"
            >
              <ChevronRight size={16} />
            </button>
          </div>
        </div>
      </div>

      {/* Color Swatches */}
      <div className="w-full">
        <span className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2 text-center">
          Color
        </span>
        <div className="grid grid-cols-5 gap-2 justify-items-center">
          {PALETTE.map((c) => (
            <button
              key={c}
              onClick={() => {
                sound.playClick();
                onChange({ ...avatar, color: c });
              }}
              style={{ backgroundColor: c }}
              className={`w-7 h-7 rounded-full border-2 transition-transform hover:scale-110 active:scale-95 ${
                avatar.color === c ? 'border-white ring-2 ring-indigo-500 scale-105' : 'border-transparent'
              }`}
            />
          ))}
        </div>
      </div>
    </div>
  );
};
