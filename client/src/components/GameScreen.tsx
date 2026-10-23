import React from 'react';
import { GameStatePayload, PlayerData, ChatMessage, RoomSettings } from '../types';
import { Canvas } from './Canvas';
import { Chat } from './Chat';
import { Leaderboard } from './Leaderboard';
import { WordSelectModal } from './WordSelectModal';
import { GameOverModal } from './GameOverModal';
import { Volume2, VolumeX, Clock, Award, Sparkles } from 'lucide-react';
import { sound } from '../services/audio';

interface GameScreenProps {
  gameState: GameStatePayload;
  players: PlayerData[];
  currentUserId: string;
  isHost: boolean;
  settings: RoomSettings;
  chatMessages: ChatMessage[];
  winner: PlayerData | null;
  leaderboard: PlayerData[];
  onExit: () => void;
}

export const GameScreen: React.FC<GameScreenProps> = ({
  gameState,
  players,
  currentUserId,
  isHost,
  settings,
  chatMessages,
  winner,
  leaderboard,
  onExit
}) => {
  const [isMuted, setIsMuted] = React.useState(sound.getMuted());

  const handleToggleMute = () => {
    const muted = sound.toggleMute();
    setIsMuted(muted);
  };

  const isDrawer = gameState.drawerId === currentUserId;
  const me = players.find((p) => p.id === currentUserId);
  const hasGuessed = me?.hasGuessed || false;

  const isLowTime = gameState.timeLeft <= 10 && gameState.phase === 'DRAWING';

  return (
    <div className="flex flex-col h-screen max-h-screen bg-slate-900 overflow-hidden select-none">
      {/* Top Bar */}
      <header className="h-14 bg-slate-800/90 border-b border-slate-700/80 px-4 flex items-center justify-between shrink-0 shadow-md backdrop-blur-md z-20">
        {/* Left: Round & Timer */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 bg-slate-900/80 px-3 py-1 rounded-xl border border-slate-700">
            <span className="text-[11px] font-extrabold text-slate-400 uppercase tracking-wider">
              Round
            </span>
            <span className="text-xs font-black text-indigo-400">
              {gameState.round} / {gameState.totalRounds}
            </span>
          </div>

          <div
            className={`flex items-center gap-1.5 px-3 py-1 rounded-xl border transition-colors ${
              isLowTime
                ? 'bg-rose-950/60 border-rose-500/50 text-rose-400 animate-pulse'
                : 'bg-slate-900/80 border-slate-700 text-amber-400'
            }`}
          >
            <Clock size={14} className={isLowTime ? 'animate-spin' : ''} />
            <span className="text-xs font-black w-6 text-center">{gameState.timeLeft}</span>
          </div>
        </div>

        {/* Center: Word Banner / Masked Hints */}
        <div className="flex-1 max-w-xl mx-4 text-center">
          {gameState.phase === 'WORD_SELECT' ? (
            <div className="text-xs font-bold text-amber-300 animate-pulse">
              {isDrawer
                ? '✨ Choose your word from the options popup!'
                : `⏳ ${gameState.drawerName || 'Drawer'} is choosing a word...`}
            </div>
          ) : gameState.phase === 'ROUND_OVER' ? (
            <div className="text-sm font-extrabold text-emerald-400 flex items-center justify-center gap-2 animate-bounce-subtle">
              <Award size={16} />
              <span>The word was: <span className="underline uppercase tracking-widest">{gameState.word}</span></span>
            </div>
          ) : (
            <div className="flex items-center justify-center gap-3">
              {isDrawer ? (
                <div className="flex items-center gap-2">
                  <span className="text-[11px] uppercase font-bold text-slate-400">DRAW THIS:</span>
                  <span className="text-base sm:text-lg font-black text-yellow-400 tracking-wider uppercase font-fredoka">
                    {gameState.word}
                  </span>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <span className="text-base sm:text-xl font-black text-slate-100 tracking-[0.25em] font-mono">
                    {gameState.hints || '_ '.repeat(gameState.wordLength)}
                  </span>
                  <span className="text-xs text-slate-400 font-bold">
                    ({gameState.wordLength})
                  </span>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Right: Sound Toggle & Exit */}
        <div className="flex items-center gap-2">
          <button
            onClick={handleToggleMute}
            className="p-2 text-slate-400 hover:text-white bg-slate-900/80 hover:bg-slate-700/80 rounded-xl border border-slate-700 transition"
            title={isMuted ? 'Unmute sounds' : 'Mute sounds'}
          >
            {isMuted ? <VolumeX size={16} /> : <Volume2 size={16} />}
          </button>
          <button
            onClick={onExit}
            className="px-3 py-1.5 text-xs font-bold text-slate-300 hover:text-white bg-slate-900/80 hover:bg-rose-900/40 rounded-xl border border-slate-700 hover:border-rose-500/40 transition"
          >
            Exit
          </button>
        </div>
      </header>

      {/* Main Game Area */}
      <div className="flex-1 flex overflow-hidden p-3 gap-3">
        {/* Left: Players & Scores */}
        <div className="hidden md:block w-52 lg:w-60 shrink-0 h-full">
          <Leaderboard
            players={players}
            currentDrawerId={gameState.drawerId}
            currentUserId={currentUserId}
            isHost={isHost}
            phase={gameState.phase}
          />
        </div>

        {/* Center: Canvas Area & Interactive Overlays */}
        <div className="flex-1 flex flex-col h-full relative rounded-2xl overflow-hidden shadow-2xl border border-slate-700">
          <Canvas isDrawer={isDrawer && gameState.phase === 'DRAWING'} drawerId={gameState.drawerId} />

          {/* Drawer Word Selection Overlay */}
          <WordSelectModal
            isOpen={isDrawer && gameState.phase === 'WORD_SELECT'}
            wordOptions={gameState.wordOptions || []}
            timeLeft={gameState.timeLeft}
          />

          {/* Round Over Banner Overlay */}
          {gameState.phase === 'ROUND_OVER' && (
            <div className="absolute inset-0 bg-slate-950/85 backdrop-blur-sm z-30 flex flex-col items-center justify-center p-6 text-center animate-fadeIn">
              <div className="p-3 bg-indigo-500/20 text-indigo-400 rounded-full mb-3 border border-indigo-500/30">
                <Sparkles size={32} />
              </div>
              <h3 className="text-xl font-bold text-slate-300 mb-1">Round Ended!</h3>
              <div className="text-3xl font-black text-yellow-400 tracking-widest uppercase mb-4 font-fredoka">
                {gameState.word}
              </div>
              <p className="text-xs text-slate-400">Next round starts in {gameState.timeLeft} seconds...</p>
            </div>
          )}

          {/* Game Over Modal with Winner & Podium */}
          {gameState.phase === 'GAME_OVER' && (
            <GameOverModal
              winner={winner}
              leaderboard={leaderboard}
              isHost={isHost}
              onExit={onExit}
            />
          )}
        </div>

        {/* Right: Chat & Guesses */}
        <div className="w-64 sm:w-72 lg:w-80 shrink-0 h-full">
          <Chat
            messages={chatMessages}
            isDrawer={isDrawer}
            hasGuessed={hasGuessed}
            isDrawingPhase={gameState.phase === 'DRAWING'}
          />
        </div>
      </div>
    </div>
  );
};
