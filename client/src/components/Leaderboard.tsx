import React from 'react';
import { PlayerData } from '../types';
import { Avatar } from './Avatar';
import { Pencil, CheckCircle2, UserX } from 'lucide-react';
import { socket } from '../services/socket';

interface LeaderboardProps {
  players: PlayerData[];
  currentDrawerId: string | null;
  currentUserId: string;
  isHost: boolean;
  phase: string;
}

export const Leaderboard: React.FC<LeaderboardProps> = ({
  players,
  currentDrawerId,
  currentUserId,
  isHost,
  phase
}) => {
  // Sort players descending by score
  const sortedPlayers = [...players].sort((a, b) => b.score - a.score);

  const getRankBadge = (index: number) => {
    switch (index) {
      case 0:
        return <span className="text-yellow-400 font-extrabold text-sm" title="1st Place">🥇 #1</span>;
      case 1:
        return <span className="text-slate-300 font-bold text-sm" title="2nd Place">🥈 #2</span>;
      case 2:
        return <span className="text-amber-600 font-bold text-sm" title="3rd Place">🥉 #3</span>;
      default:
        return <span className="text-slate-500 font-semibold text-xs">#{index + 1}</span>;
    }
  };

  const handleKick = (targetId: string, name: string) => {
    if (window.confirm(`Kick ${name} from room?`)) {
      socket.emit('kick_player', { targetPlayerId: targetId });
    }
  };

  return (
    <div className="flex flex-col h-full bg-slate-800/90 rounded-2xl border border-slate-700/80 shadow-xl overflow-hidden backdrop-blur-md">
      {/* Header */}
      <div className="px-4 py-3 bg-slate-900/80 border-b border-slate-700/80 flex items-center justify-between">
        <h3 className="font-bold text-sm tracking-wide text-slate-200">
          🏆 Leaderboard
        </h3>
        <span className="text-xs bg-slate-800 text-slate-400 font-bold px-2 py-0.5 rounded-full border border-slate-700">
          {players.length} Players
        </span>
      </div>

      {/* Players List */}
      <div className="flex-1 p-2.5 overflow-y-auto space-y-1.5">
        {sortedPlayers.map((p, index) => {
          const isDrawer = p.id === currentDrawerId;
          const isMe = p.id === currentUserId;

          return (
            <div
              key={p.id}
              className={`flex items-center gap-2.5 p-2 rounded-xl transition border ${
                isMe
                  ? 'bg-indigo-950/40 border-indigo-500/40 ring-1 ring-indigo-500/30'
                  : 'bg-slate-900/50 border-slate-700/40 hover:bg-slate-900/80'
              }`}
            >
              {/* Rank */}
              <div className="w-8 shrink-0 text-center">
                {getRankBadge(index)}
              </div>

              {/* Avatar */}
              <Avatar
                avatar={p.avatar}
                size={36}
                showCrown={p.isHost}
              />

              {/* Player Name & Score */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5">
                  <span className={`text-xs font-bold truncate ${isMe ? 'text-indigo-300' : 'text-slate-200'}`}>
                    {p.name} {isMe && '(You)'}
                  </span>
                  {isDrawer && phase === 'DRAWING' && (
                    <span className="text-amber-400 animate-bounce-subtle" title="Currently Drawing">
                      <Pencil size={12} />
                    </span>
                  )}
                  {p.hasGuessed && phase === 'DRAWING' && (
                    <span className="text-emerald-400" title="Guessed the word!">
                      <CheckCircle2 size={13} />
                    </span>
                  )}
                </div>
                <div className="text-[11px] font-extrabold text-slate-400">
                  {p.score} <span className="text-[10px] font-normal text-slate-500">pts</span>
                  {p.roundScore > 0 && phase === 'ROUND_OVER' && (
                    <span className="text-emerald-400 ml-1.5 font-bold">
                      +{p.roundScore}
                    </span>
                  )}
                </div>
              </div>

              {/* Host kick player button */}
              {isHost && !p.isHost && (
                <button
                  onClick={() => handleKick(p.id, p.name)}
                  className="p-1 text-slate-500 hover:text-rose-400 hover:bg-rose-950/40 rounded transition"
                  title={`Kick ${p.name}`}
                >
                  <UserX size={14} />
                </button>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
