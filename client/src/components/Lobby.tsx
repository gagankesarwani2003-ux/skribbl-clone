import React, { useState } from 'react';
import { PlayerData, RoomSettings } from '../types';
import { Avatar } from './Avatar';
import {
  Play,
  Copy,
  Check,
  Share2,
  Settings,
  Users,
  Timer,
  BookOpen,
  HelpCircle,
  Sparkles,
  Lock,
  Globe
} from 'lucide-react';
import { socket } from '../services/socket';
import { sound } from '../services/audio';

interface LobbyProps {
  roomCode: string;
  players: PlayerData[];
  settings: RoomSettings;
  currentUserId: string;
  isHost: boolean;
  onLeave: () => void;
}

export const Lobby: React.FC<LobbyProps> = ({
  roomCode,
  players,
  settings,
  currentUserId,
  isHost,
  onLeave
}) => {
  const [copied, setCopied] = useState(false);
  const [localSettings, setLocalSettings] = useState<RoomSettings>(settings);
  const [customWordsText, setCustomWordsText] = useState(
    settings.customWords ? settings.customWords.join(', ') : ''
  );

  const inviteLink = `${window.location.origin}?room=${roomCode}`;

  const copyInvite = () => {
    sound.playClick();
    navigator.clipboard.writeText(inviteLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleStartGame = () => {
    sound.playClick();
    if (players.length < 2) {
      alert('Need at least 2 players to start a game! Share the invite link with a friend.');
      return;
    }
    socket.emit('start_game');
  };

  const handleSettingChange = (field: keyof RoomSettings, value: any) => {
    if (!isHost) return;
    const updated = { ...localSettings, [field]: value };
    setLocalSettings(updated);
    socket.emit('update_settings', updated);
  };

  const handleCustomWordsBlur = () => {
    if (!isHost) return;
    const words = customWordsText
      .split(',')
      .map((w) => w.trim().toLowerCase())
      .filter((w) => w.length > 1);

    handleSettingChange('customWords', words);
  };

  return (
    <div className="max-w-5xl mx-auto w-full p-4 sm:p-6 space-y-6 animate-fadeIn">
      {/* Top Banner: Room Code & Quick Share */}
      <div className="bg-slate-800/90 border border-slate-700/80 rounded-3xl p-5 shadow-2xl backdrop-blur-md flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs uppercase font-extrabold tracking-wider text-indigo-400">
              Room Code
            </span>
            <span className="text-xs px-2 py-0.5 rounded-full font-bold bg-slate-700 text-slate-300 flex items-center gap-1">
              {settings.isPublic ? <Globe size={11} /> : <Lock size={11} />}
              {settings.isPublic ? 'Public' : 'Private'}
            </span>
          </div>
          <div className="text-3xl sm:text-4xl font-black text-white tracking-widest mt-1 font-fredoka">
            {roomCode}
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={copyInvite}
            className="py-2.5 px-4 bg-indigo-600 hover:bg-indigo-500 active:scale-95 text-white rounded-2xl font-bold text-xs sm:text-sm transition flex items-center gap-2 shadow-lg"
          >
            {copied ? <Check size={16} /> : <Share2 size={16} />}
            <span>{copied ? 'Link Copied!' : 'Copy Invite Link'}</span>
          </button>
          <button
            onClick={onLeave}
            className="py-2.5 px-4 bg-slate-700 hover:bg-slate-600 active:scale-95 text-slate-300 rounded-2xl font-bold text-xs sm:text-sm transition"
          >
            Leave
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Players in Lobby */}
        <div className="lg:col-span-2 bg-slate-800/90 border border-slate-700/80 rounded-3xl p-6 shadow-2xl backdrop-blur-md flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                <Users size={20} className="text-indigo-400" />
                <span>Players ({players.length}/{settings.maxPlayers})</span>
              </h2>
              {players.length < 2 && (
                <span className="text-xs font-semibold text-amber-400 bg-amber-950/40 border border-amber-500/30 px-3 py-1 rounded-full animate-pulse">
                  Waiting for at least 1 more player...
                </span>
              )}
            </div>

            {/* Players Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
              {players.map((p) => {
                const isMe = p.id === currentUserId;
                return (
                  <div
                    key={p.id}
                    className={`flex flex-col items-center p-4 rounded-2xl border transition-all ${
                      isMe
                        ? 'bg-indigo-950/40 border-indigo-500/50 shadow-md ring-1 ring-indigo-500/30'
                        : 'bg-slate-900/60 border-slate-700/60 hover:border-slate-600'
                    }`}
                  >
                    <Avatar avatar={p.avatar} size={64} showCrown={p.isHost} />
                    <span className="font-bold text-sm text-slate-100 mt-2 truncate max-w-full">
                      {p.name}
                    </span>
                    <span className="text-[11px] font-semibold text-slate-400 mt-0.5">
                      {p.isHost ? 'Host 👑' : isMe ? 'You' : 'Ready'}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Host Start Game Area */}
          <div className="mt-8 pt-4 border-t border-slate-700/60 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="text-xs text-slate-400 text-center sm:text-left">
              {isHost
                ? players.length >= 2
                  ? 'All set! Click Start to begin the game.'
                  : 'Invite friends or open another browser tab to test multiplayer.'
                : 'Waiting for the host to start the game...'}
            </div>

            {isHost && (
              <button
                onClick={handleStartGame}
                disabled={players.length < 2}
                className="w-full sm:w-auto py-3.5 px-8 bg-emerald-600 hover:bg-emerald-500 active:scale-95 text-white rounded-2xl font-black text-base transition flex items-center justify-center gap-2 shadow-xl disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
              >
                <Play size={20} />
                <span>Start Game</span>
              </button>
            )}
          </div>
        </div>

        {/* Right Col: Host Game Settings */}
        <div className="bg-slate-800/90 border border-slate-700/80 rounded-3xl p-6 shadow-2xl backdrop-blur-md">
          <h2 className="text-lg font-bold text-white flex items-center gap-2 mb-4">
            <Settings size={20} className="text-indigo-400" />
            <span>Room Settings {isHost ? '' : '(Host Only)'}</span>
          </h2>

          <div className="space-y-4 text-xs">
            {/* Rounds */}
            <div>
              <div className="flex justify-between font-bold text-slate-300 mb-1">
                <span>Rounds</span>
                <span className="text-indigo-400">{localSettings.rounds}</span>
              </div>
              <input
                type="range"
                min="2"
                max="10"
                value={localSettings.rounds}
                disabled={!isHost}
                onChange={(e) => handleSettingChange('rounds', Number(e.target.value))}
                className="w-full accent-indigo-500 cursor-pointer disabled:cursor-not-allowed"
              />
            </div>

            {/* Draw Time */}
            <div>
              <div className="flex justify-between font-bold text-slate-300 mb-1">
                <span>Draw Time</span>
                <span className="text-indigo-400">{localSettings.drawTime}s</span>
              </div>
              <input
                type="range"
                min="20"
                max="180"
                step="10"
                value={localSettings.drawTime}
                disabled={!isHost}
                onChange={(e) => handleSettingChange('drawTime', Number(e.target.value))}
                className="w-full accent-indigo-500 cursor-pointer disabled:cursor-not-allowed"
              />
            </div>

            {/* Word Choices */}
            <div>
              <div className="flex justify-between font-bold text-slate-300 mb-1">
                <span>Word Choices</span>
                <span className="text-indigo-400">{localSettings.wordCount || 3}</span>
              </div>
              <input
                type="range"
                min="1"
                max="5"
                value={localSettings.wordCount || 3}
                disabled={!isHost}
                onChange={(e) => handleSettingChange('wordCount', Number(e.target.value))}
                className="w-full accent-indigo-500 cursor-pointer disabled:cursor-not-allowed"
              />
            </div>

            {/* Hints Count */}
            <div>
              <div className="flex justify-between font-bold text-slate-300 mb-1">
                <span>Letter Hints</span>
                <span className="text-indigo-400">{localSettings.hintsCount} hints</span>
              </div>
              <input
                type="range"
                min="0"
                max="5"
                value={localSettings.hintsCount}
                disabled={!isHost}
                onChange={(e) => handleSettingChange('hintsCount', Number(e.target.value))}
                className="w-full accent-indigo-500 cursor-pointer disabled:cursor-not-allowed"
              />
            </div>

            {/* Category */}
            <div>
              <label className="block font-bold text-slate-300 mb-1">Word Category</label>
              <select
                value={localSettings.wordCategory}
                disabled={!isHost}
                onChange={(e) => handleSettingChange('wordCategory', e.target.value)}
                className="w-full bg-slate-900 border border-slate-700 rounded-xl p-2 text-white font-medium focus:outline-none focus:border-indigo-500 disabled:opacity-60 cursor-pointer"
              >
                <option value="all">🌟 All Categories</option>
                <option value="animals">🦁 Animals</option>
                <option value="food">🍕 Food & Drinks</option>
                <option value="objects">🎸 Everyday Objects</option>
                <option value="actions">💃 Actions & Verbs</option>
                <option value="custom">✍️ Custom Words Only</option>
              </select>
            </div>

            {/* Custom Words */}
            <div>
              <label className="block font-bold text-slate-300 mb-1">
                Custom Words (comma separated)
              </label>
              <textarea
                value={customWordsText}
                disabled={!isHost}
                onChange={(e) => setCustomWordsText(e.target.value)}
                onBlur={handleCustomWordsBlur}
                placeholder="dragon, skyscraper, spaceship, pokemon"
                rows={2}
                className="w-full bg-slate-900 border border-slate-700 rounded-xl p-2 text-white text-xs placeholder-slate-600 focus:outline-none focus:border-indigo-500 disabled:opacity-60 resize-none"
              />
            </div>

            {/* Public Room Toggle */}
            <div className="flex items-center justify-between pt-2">
              <span className="font-bold text-slate-300">Public Room</span>
              <button
                type="button"
                disabled={!isHost}
                onClick={() => handleSettingChange('isPublic', !localSettings.isPublic)}
                className={`w-12 h-6 rounded-full transition-colors relative ${
                  localSettings.isPublic ? 'bg-indigo-600' : 'bg-slate-700'
                } disabled:opacity-60`}
              >
                <div
                  className={`w-4 h-4 rounded-full bg-white transition-transform absolute top-1 ${
                    localSettings.isPublic ? 'left-7' : 'left-1'
                  }`}
                />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
