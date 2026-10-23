import React, { useState, useEffect } from 'react';
import { PlayerAvatar, PublicRoomInfo } from '../types';
import { AvatarPicker } from './AvatarPicker';
import {
  Play,
  PlusCircle,
  LogIn,
  Globe,
  HelpCircle,
  RefreshCw,
  Users,
  Sparkles
} from 'lucide-react';
import { socket } from '../services/socket';
import { sound } from '../services/audio';

interface HomeProps {
  onCreateRoom: (name: string, avatar: PlayerAvatar) => void;
  onJoinRoom: (code: string, name: string, avatar: PlayerAvatar) => void;
  onQuickJoin: (name: string, avatar: PlayerAvatar) => void;
  initialRoomCode?: string;
}

export const Home: React.FC<HomeProps> = ({
  onCreateRoom,
  onJoinRoom,
  onQuickJoin,
  initialRoomCode = ''
}) => {
  const [playerName, setPlayerName] = useState(() => {
    return localStorage.getItem('skribbl_player_name') || `Artist_${Math.floor(100 + Math.random() * 900)}`;
  });

  const [avatar, setAvatar] = useState<PlayerAvatar>(() => {
    const saved = localStorage.getItem('skribbl_player_avatar');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {}
    }
    return {
      color: '#3b82f6',
      eyes: Math.floor(Math.random() * 6),
      mouth: Math.floor(Math.random() * 6)
    };
  });

  const [joinCode, setJoinCode] = useState(initialRoomCode);
  const [publicRooms, setPublicRooms] = useState<PublicRoomInfo[]>([]);
  const [activeTab, setActiveTab] = useState<'play' | 'public_rooms' | 'rules'>('play');
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Save profile to localStorage
  useEffect(() => {
    localStorage.setItem('skribbl_player_name', playerName);
  }, [playerName]);

  useEffect(() => {
    localStorage.setItem('skribbl_player_avatar', JSON.stringify(avatar));
  }, [avatar]);

  // Fetch public rooms
  const fetchPublicRooms = () => {
    setIsRefreshing(true);
    sound.playClick();
    socket.emit('get_public_rooms', (data: { rooms: PublicRoomInfo[] }) => {
      setPublicRooms(data.rooms || []);
      setIsRefreshing(false);
    });
  };

  useEffect(() => {
    if (activeTab === 'public_rooms') {
      fetchPublicRooms();
    }
  }, [activeTab]);

  const handleQuickPlay = () => {
    sound.playClick();
    onQuickJoin(playerName, avatar);
  };

  const handleCreate = () => {
    sound.playClick();
    onCreateRoom(playerName, avatar);
  };

  const handleJoin = (e: React.FormEvent) => {
    e.preventDefault();
    if (!joinCode.trim()) return;
    sound.playClick();
    onJoinRoom(joinCode.trim(), playerName, avatar);
  };

  return (
    <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center p-4 sm:p-6 relative select-none">
      {/* Background Decorative Gradient Blobs */}
      <div className="absolute top-10 left-10 w-72 h-72 bg-indigo-600/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-10 right-10 w-96 h-96 bg-purple-600/10 rounded-full blur-3xl pointer-events-none" />

      {/* Main Header / Logo */}
      <div className="text-center mb-8 z-10 animate-fadeIn">
        <div className="inline-flex items-center gap-2 px-3 py-1 bg-indigo-500/10 border border-indigo-500/30 rounded-full text-indigo-400 text-xs font-bold mb-3">
          <Sparkles size={14} />
          <span>Real-time Multiplayer Drawing Game</span>
        </div>
        <h1 className="text-5xl sm:text-6xl font-black text-white tracking-wider font-fredoka drop-shadow-md">
          skribbl<span className="text-indigo-400">.io</span>
        </h1>
        <p className="text-slate-400 text-sm mt-1">
          Draw, Guess, and Win with Friends in Real Time!
        </p>
      </div>

      {/* Main Card */}
      <div className="max-w-3xl w-full bg-slate-800/90 border border-slate-700/80 rounded-3xl p-6 sm:p-8 shadow-2xl backdrop-blur-md z-10">
        {/* Navigation Tabs */}
        <div className="flex items-center justify-center gap-2 mb-6 border-b border-slate-700/60 pb-4">
          <button
            onClick={() => setActiveTab('play')}
            className={`py-2 px-4 rounded-xl text-xs sm:text-sm font-bold transition flex items-center gap-1.5 ${
              activeTab === 'play'
                ? 'bg-indigo-600 text-white shadow'
                : 'text-slate-400 hover:text-white hover:bg-slate-700/50'
            }`}
          >
            <Play size={16} />
            <span>Play</span>
          </button>
          <button
            onClick={() => setActiveTab('public_rooms')}
            className={`py-2 px-4 rounded-xl text-xs sm:text-sm font-bold transition flex items-center gap-1.5 ${
              activeTab === 'public_rooms'
                ? 'bg-indigo-600 text-white shadow'
                : 'text-slate-400 hover:text-white hover:bg-slate-700/50'
            }`}
          >
            <Globe size={16} />
            <span>Public Rooms</span>
          </button>
          <button
            onClick={() => setActiveTab('rules')}
            className={`py-2 px-4 rounded-xl text-xs sm:text-sm font-bold transition flex items-center gap-1.5 ${
              activeTab === 'rules'
                ? 'bg-indigo-600 text-white shadow'
                : 'text-slate-400 hover:text-white hover:bg-slate-700/50'
            }`}
          >
            <HelpCircle size={16} />
            <span>How to Play</span>
          </button>
        </div>

        {activeTab === 'play' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
            {/* Left Col: Avatar Customizer */}
            <div className="flex flex-col items-center">
              <AvatarPicker avatar={avatar} onChange={setAvatar} />
            </div>

            {/* Right Col: Name Input & Action Buttons */}
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">
                  Your Nickname
                </label>
                <input
                  type="text"
                  value={playerName}
                  onChange={(e) => setPlayerName(e.target.value)}
                  maxLength={16}
                  placeholder="Enter your name..."
                  className="w-full bg-slate-900 border border-slate-700 rounded-2xl px-4 py-3 text-white font-bold text-sm focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition shadow-inner"
                />
              </div>

              {/* Quick Play Button */}
              <button
                onClick={handleQuickPlay}
                className="w-full py-4 px-6 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 active:scale-95 text-white rounded-2xl font-black text-base transition flex items-center justify-center gap-2 shadow-xl cursor-pointer"
              >
                <Play size={20} />
                <span>Play Now (Quick Match)</span>
              </button>

              <div className="flex items-center gap-3 my-2">
                <div className="h-px bg-slate-700 flex-1" />
                <span className="text-[11px] font-bold text-slate-500 uppercase">Or</span>
                <div className="h-px bg-slate-700 flex-1" />
              </div>

              {/* Create Room Button */}
              <button
                onClick={handleCreate}
                className="w-full py-3 px-6 bg-indigo-600 hover:bg-indigo-500 active:scale-95 text-white rounded-2xl font-bold text-sm transition flex items-center justify-center gap-2 shadow-lg cursor-pointer"
              >
                <PlusCircle size={18} />
                <span>Create Private Room</span>
              </button>

              {/* Join with Code Form */}
              <form onSubmit={handleJoin} className="flex gap-2">
                <input
                  type="text"
                  value={joinCode}
                  onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                  maxLength={6}
                  placeholder="ROOM CODE"
                  className="w-full bg-slate-900 border border-slate-700 rounded-2xl px-4 py-3 text-white font-mono font-bold text-sm tracking-wider uppercase text-center focus:outline-none focus:border-indigo-500 transition"
                />
                <button
                  type="submit"
                  disabled={!joinCode.trim()}
                  className="px-5 bg-slate-700 hover:bg-slate-600 active:scale-95 text-white rounded-2xl font-bold text-sm transition disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1.5 shadow"
                >
                  <LogIn size={16} />
                  <span>Join</span>
                </button>
              </form>
            </div>
          </div>
        )}

        {/* Public Rooms Browser */}
        {activeTab === 'public_rooms' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                Active Public Rooms
              </span>
              <button
                onClick={fetchPublicRooms}
                disabled={isRefreshing}
                className="p-1.5 bg-slate-700 hover:bg-slate-600 text-slate-200 rounded-xl text-xs font-semibold flex items-center gap-1 transition"
              >
                <RefreshCw size={14} className={isRefreshing ? 'animate-spin' : ''} />
                <span>Refresh</span>
              </button>
            </div>

            {publicRooms.length === 0 ? (
              <div className="text-center py-10 bg-slate-900/50 rounded-2xl border border-slate-700/50">
                <Globe size={32} className="mx-auto text-slate-600 mb-2" />
                <p className="text-sm font-semibold text-slate-400">No public rooms right now.</p>
                <p className="text-xs text-slate-500 mt-1">
                  Click "Create Private Room" or "Play Now" to start one!
                </p>
              </div>
            ) : (
              <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
                {publicRooms.map((room) => (
                  <div
                    key={room.id}
                    className="flex items-center justify-between p-3.5 bg-slate-900/70 hover:bg-slate-900 border border-slate-700/60 rounded-2xl transition"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-sm text-white font-mono">{room.code}</span>
                        <span className="text-xs text-slate-400">by {room.hostName}</span>
                      </div>
                      <div className="text-[11px] text-slate-500 mt-0.5">
                        Round {room.currentRound}/{room.totalRounds} • Status: {room.phase}
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      <span className="text-xs font-bold text-indigo-400 flex items-center gap-1">
                        <Users size={14} />
                        {room.playerCount}/{room.maxPlayers}
                      </span>
                      <button
                        onClick={() => {
                          sound.playClick();
                          onJoinRoom(room.code, playerName, avatar);
                        }}
                        className="py-1.5 px-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold transition active:scale-95 shadow"
                      >
                        Join
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* How to Play Guide */}
        {activeTab === 'rules' && (
          <div className="space-y-4 text-xs sm:text-sm text-slate-300 leading-relaxed bg-slate-900/50 p-5 rounded-2xl border border-slate-700/60">
            <h3 className="font-bold text-white text-base mb-2">Game Rules</h3>
            <ul className="space-y-2 list-disc list-inside">
              <li>
                <strong className="text-indigo-400">Turn-based drawing:</strong> Each round, one player gets chosen to draw a secret word.
              </li>
              <li>
                <strong className="text-indigo-400">Guessing:</strong> Other players type guesses in the chat box to guess the word.
              </li>
              <li>
                <strong className="text-indigo-400">Points:</strong> The faster you guess the word correctly, the more points you earn!
              </li>
              <li>
                <strong className="text-indigo-400">Drawer points:</strong> The drawer also earns points when other players successfully guess!
              </li>
              <li>
                <strong className="text-indigo-400">Letter Hints:</strong> Blanks show word length (`_ _ _ _`), and letters reveal over time.
              </li>
              <li>
                <strong className="text-indigo-400">Winner:</strong> The player with the highest total score after all rounds wins the crown! 👑
              </li>
            </ul>
          </div>
        )}
      </div>

      {/* Footer Info */}
      <footer className="mt-8 text-center text-xs text-slate-500">
        Skribbl.io Full-Stack Clone • Built with React, TypeScript, HTML5 Canvas & WebSockets
      </footer>
    </div>
  );
};
