import React, { useEffect } from 'react';
import confetti from 'canvas-confetti';
import { PlayerData } from '../types';
import { Avatar } from './Avatar';
import { Trophy, RotateCcw, Home } from 'lucide-react';
import { sound } from '../services/audio';
import { socket } from '../services/socket';

interface GameOverModalProps {
  winner: PlayerData | null;
  leaderboard: PlayerData[];
  isHost: boolean;
  onExit: () => void;
}

export const GameOverModal: React.FC<GameOverModalProps> = ({
  winner,
  leaderboard,
  isHost,
  onExit
}) => {
  useEffect(() => {
    sound.playWinner();

    // Trigger confetti fireworks
    const duration = 3.5 * 1000;
    const end = Date.now() + duration;

    const frame = () => {
      confetti({
        particleCount: 4,
        angle: 60,
        spread: 55,
        origin: { x: 0 }
      });
      confetti({
        particleCount: 4,
        angle: 120,
        spread: 55,
        origin: { x: 1 }
      });

      if (Date.now() < end) {
        requestAnimationFrame(frame);
      }
    };
    frame();
  }, []);

  const handleRestart = () => {
    sound.playClick();
    socket.emit('start_game');
  };

  const top3 = leaderboard.slice(0, 3);
  const rest = leaderboard.slice(3);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-fadeIn">
      <div className="bg-slate-800 border-2 border-yellow-500/40 rounded-3xl p-6 sm:p-8 max-w-xl w-full shadow-2xl text-center">
        <div className="inline-flex items-center justify-center w-16 h-16 bg-yellow-500/20 text-yellow-400 rounded-3xl mb-3 border border-yellow-500/30">
          <Trophy size={36} />
        </div>

        <h2 className="text-3xl font-black text-white tracking-wide mb-1">
          Game Over!
        </h2>
        <p className="text-slate-400 text-xs sm:text-sm mb-6">
          Congratulations to the champion!
        </p>

        {/* Podium for top 3 */}
        <div className="flex items-end justify-center gap-3 sm:gap-4 mb-6 pt-4">
          {/* 2nd Place */}
          {top3[1] && (
            <div className="flex flex-col items-center flex-1 max-w-[120px]">
              <Avatar avatar={top3[1].avatar} size={50} />
              <span className="font-bold text-xs text-slate-200 mt-2 truncate w-full">
                {top3[1].name}
              </span>
              <span className="text-[11px] font-bold text-slate-400">{top3[1].score} pts</span>
              <div className="w-full bg-slate-700/80 rounded-t-xl h-16 mt-2 flex items-center justify-center font-black text-slate-300 text-lg border-t-2 border-slate-500">
                🥈 2
              </div>
            </div>
          )}

          {/* 1st Place */}
          {top3[0] && (
            <div className="flex flex-col items-center flex-1 max-w-[140px]">
              <span className="text-2xl mb-1 animate-bounce-subtle">👑</span>
              <Avatar avatar={top3[0].avatar} size={64} />
              <span className="font-extrabold text-sm text-yellow-400 mt-2 truncate w-full">
                {top3[0].name}
              </span>
              <span className="text-xs font-black text-yellow-300">{top3[0].score} pts</span>
              <div className="w-full bg-yellow-500/20 rounded-t-xl h-24 mt-2 flex items-center justify-center font-black text-yellow-400 text-2xl border-t-2 border-yellow-400">
                🥇 1
              </div>
            </div>
          )}

          {/* 3rd Place */}
          {top3[2] && (
            <div className="flex flex-col items-center flex-1 max-w-[120px]">
              <Avatar avatar={top3[2].avatar} size={46} />
              <span className="font-bold text-xs text-slate-200 mt-2 truncate w-full">
                {top3[2].name}
              </span>
              <span className="text-[11px] font-bold text-slate-400">{top3[2].score} pts</span>
              <div className="w-full bg-amber-900/30 rounded-t-xl h-12 mt-2 flex items-center justify-center font-black text-amber-500 text-base border-t-2 border-amber-600">
                🥉 3
              </div>
            </div>
          )}
        </div>

        {/* Remaining players list */}
        {rest.length > 0 && (
          <div className="bg-slate-900/60 rounded-xl p-3 mb-6 max-h-32 overflow-y-auto space-y-1.5 text-xs">
            {rest.map((p, idx) => (
              <div key={p.id} className="flex items-center justify-between px-2 text-slate-300">
                <span className="flex items-center gap-2">
                  <span className="font-bold text-slate-500">#{idx + 4}</span>
                  <span className="font-semibold">{p.name}</span>
                </span>
                <span className="font-bold text-slate-400">{p.score} pts</span>
              </div>
            ))}
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex items-center justify-center gap-3">
          {isHost ? (
            <button
              onClick={handleRestart}
              className="py-3 px-6 bg-indigo-600 hover:bg-indigo-500 active:scale-95 text-white rounded-2xl font-bold text-sm transition flex items-center gap-2 shadow-lg"
            >
              <RotateCcw size={18} />
              <span>Play Again</span>
            </button>
          ) : (
            <span className="text-xs text-slate-400 italic">Waiting for host to restart...</span>
          )}

          <button
            onClick={onExit}
            className="py-3 px-6 bg-slate-700 hover:bg-slate-600 active:scale-95 text-slate-200 rounded-2xl font-bold text-sm transition flex items-center gap-2"
          >
            <Home size={18} />
            <span>Leave Room</span>
          </button>
        </div>
      </div>
    </div>
  );
};
