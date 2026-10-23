import React from 'react';
import { socket } from '../services/socket';
import { sound } from '../services/audio';
import { Sparkles, Clock } from 'lucide-react';

interface WordSelectModalProps {
  wordOptions: string[];
  timeLeft: number;
  isOpen: boolean;
}

export const WordSelectModal: React.FC<WordSelectModalProps> = ({
  wordOptions,
  timeLeft,
  isOpen
}) => {
  if (!isOpen) return null;

  const handleSelectWord = (word: string) => {
    sound.playClick();
    socket.emit('word_chosen', { word });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4 animate-fadeIn">
      <div className="bg-slate-800 border-2 border-indigo-500/50 rounded-3xl p-6 sm:p-8 max-w-lg w-full shadow-2xl text-center transform transition-all scale-100">
        <div className="inline-flex items-center justify-center w-14 h-14 bg-indigo-500/20 text-indigo-400 rounded-2xl mb-4 border border-indigo-500/30">
          <Sparkles size={28} />
        </div>

        <h2 className="text-2xl font-black text-white tracking-wide mb-1 font-fredoka">
          Choose a Word!
        </h2>
        <p className="text-slate-400 text-xs sm:text-sm mb-6">
          Pick one word to draw for everyone.
        </p>

        {/* Word Options */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-6">
          {wordOptions.map((word) => (
            <button
              key={word}
              onClick={() => handleSelectWord(word)}
              className="py-4 px-3 bg-slate-900/90 hover:bg-indigo-600 border border-slate-700 hover:border-indigo-400 rounded-2xl font-extrabold text-sm sm:text-base text-slate-100 hover:text-white transition-all transform hover:-translate-y-1 active:translate-y-0 shadow-lg capitalize"
            >
              {word}
            </button>
          ))}
        </div>

        {/* Countdown */}
        <div className="flex items-center justify-center gap-2 text-xs font-bold text-amber-400 bg-amber-950/30 py-2 px-4 rounded-full border border-amber-500/30 max-w-xs mx-auto">
          <Clock size={15} />
          <span>Auto-picking in {timeLeft} seconds</span>
        </div>
      </div>
    </div>
  );
};
