import React, { useState, useRef, useEffect } from 'react';
import { ChatMessage } from '../types';
import { Send, CheckCircle2, AlertCircle } from 'lucide-react';
import { socket } from '../services/socket';
import { sound } from '../services/audio';

interface ChatProps {
  messages: ChatMessage[];
  isDrawer: boolean;
  hasGuessed: boolean;
  isDrawingPhase: boolean;
}

export const Chat: React.FC<ChatProps> = ({
  messages,
  isDrawer,
  hasGuessed,
  isDrawingPhase
}) => {
  const [inputText, setInputText] = useState('');
  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = inputText.trim();
    if (!trimmed) return;

    sound.playClick();
    if (isDrawingPhase && !isDrawer && !hasGuessed) {
      socket.emit('guess', { text: trimmed });
    } else {
      socket.emit('chat', { text: trimmed });
    }

    setInputText('');
  };

  return (
    <div className="flex flex-col h-full bg-slate-800/90 rounded-2xl border border-slate-700/80 shadow-xl overflow-hidden backdrop-blur-md">
      {/* Header */}
      <div className="px-4 py-3 bg-slate-900/80 border-b border-slate-700/80 flex items-center justify-between">
        <h3 className="font-bold text-sm tracking-wide text-slate-200 flex items-center gap-2">
          <span>💬 Chat & Guesses</span>
        </h3>
        {hasGuessed && (
          <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center gap-1">
            <CheckCircle2 size={12} /> Guessed!
          </span>
        )}
      </div>

      {/* Messages list */}
      <div className="flex-1 p-3 overflow-y-auto space-y-2 text-xs select-text">
        {messages.length === 0 && (
          <div className="text-center text-slate-500 py-6 text-xs italic">
            No messages yet. Say hello or guess the drawing!
          </div>
        )}

        {messages.map((msg) => {
          if (msg.type === 'correct') {
            return (
              <div
                key={msg.id}
                className="p-2 rounded-xl bg-emerald-950/40 border border-emerald-500/40 text-emerald-300 font-bold shadow-sm"
              >
                {msg.text}
              </div>
            );
          }

          if (msg.type === 'close') {
            return (
              <div
                key={msg.id}
                className="p-2 rounded-xl bg-amber-950/40 border border-amber-500/40 text-amber-300 font-semibold flex items-center gap-1.5 shadow-sm"
              >
                <AlertCircle size={14} className="shrink-0 text-amber-400" />
                <span>{msg.text}</span>
              </div>
            );
          }

          if (msg.type === 'system') {
            return (
              <div key={msg.id} className="text-center text-slate-400 py-1 text-[11px] font-medium">
                — {msg.text} —
              </div>
            );
          }

          if (msg.type === 'guessed_chat') {
            return (
              <div
                key={msg.id}
                className="p-1.5 px-2 rounded-lg bg-emerald-900/20 border border-emerald-800/30 text-slate-300 text-xs"
              >
                <span className="font-bold text-emerald-400 mr-1 flex-inline items-center">
                  {msg.senderName}:
                </span>
                <span className="break-words">{msg.text}</span>
              </div>
            );
          }

          return (
            <div key={msg.id} className="leading-relaxed break-words">
              <span className="font-bold text-indigo-400 mr-1.5">{msg.senderName}:</span>
              <span className="text-slate-200">{msg.text}</span>
            </div>
          );
        })}
        <div ref={messagesEndRef} />
      </div>

      {/* Input area */}
      <form onSubmit={handleSubmit} className="p-2.5 bg-slate-900/90 border-t border-slate-700/80 flex gap-2">
        <input
          type="text"
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          placeholder={
            isDrawer
              ? 'You are drawing! You cannot guess.'
              : hasGuessed
              ? 'Chat with other guessers...'
              : 'Type your guess here...'
          }
          disabled={isDrawer}
          maxLength={100}
          className="flex-1 bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
        />
        <button
          type="submit"
          disabled={isDrawer || !inputText.trim()}
          className="p-2 bg-indigo-600 hover:bg-indigo-500 active:scale-95 text-white rounded-xl disabled:opacity-40 disabled:cursor-not-allowed transition shadow-md"
        >
          <Send size={16} />
        </button>
      </form>
    </div>
  );
};
