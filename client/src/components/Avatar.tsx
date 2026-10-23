import React from 'react';
import { PlayerAvatar } from '../types';

interface AvatarProps {
  avatar: PlayerAvatar;
  size?: number;
  className?: string;
  showCrown?: boolean;
}

export const Avatar: React.FC<AvatarProps> = ({
  avatar,
  size = 48,
  className = '',
  showCrown = false
}) => {
  const { color = '#3b82f6', eyes = 0, mouth = 0 } = avatar;

  // Eye variants (index 0 - 5)
  const renderEyes = () => {
    switch (eyes % 6) {
      case 0: // Normal round eyes with highlight
        return (
          <>
            <circle cx="36" cy="42" r="6" fill="#1e293b" />
            <circle cx="38" cy="40" r="2.2" fill="#ffffff" />
            <circle cx="64" cy="42" r="6" fill="#1e293b" />
            <circle cx="66" cy="40" r="2.2" fill="#ffffff" />
          </>
        );
      case 1: // Happy curved eyes ^ ^
        return (
          <>
            <path d="M 30 44 Q 36 36 42 44" stroke="#1e293b" strokeWidth="3.5" strokeLinecap="round" fill="none" />
            <path d="M 58 44 Q 64 36 70 44" stroke="#1e293b" strokeWidth="3.5" strokeLinecap="round" fill="none" />
          </>
        );
      case 2: // Wink eye ;)
        return (
          <>
            <path d="M 30 42 Q 36 38 42 42" stroke="#1e293b" strokeWidth="4" strokeLinecap="round" fill="none" />
            <circle cx="64" cy="42" r="6" fill="#1e293b" />
            <circle cx="66" cy="40" r="2.2" fill="#ffffff" />
          </>
        );
      case 3: // Cool sunglasses
        return (
          <>
            <path d="M 26 40 L 46 40 L 42 50 L 30 50 Z" fill="#0f172a" stroke="#0f172a" strokeWidth="2" strokeLinejoin="round" />
            <path d="M 54 40 L 74 40 L 70 50 L 58 50 Z" fill="#0f172a" stroke="#0f172a" strokeWidth="2" strokeLinejoin="round" />
            <line x1="46" y1="42" x2="54" y2="42" stroke="#0f172a" strokeWidth="3" />
            <line x1="28" y1="42" x2="40" y2="48" stroke="#38bdf8" strokeWidth="1.5" strokeLinecap="round" opacity="0.6" />
          </>
        );
      case 4: // Sleepy / chill
        return (
          <>
            <line x1="30" y1="44" x2="42" y2="44" stroke="#1e293b" strokeWidth="3.5" strokeLinecap="round" />
            <line x1="58" y1="44" x2="70" y2="44" stroke="#1e293b" strokeWidth="3.5" strokeLinecap="round" />
          </>
        );
      case 5: // Star eyes!
        return (
          <>
            <polygon points="36,36 38,41 43,41 39,44 41,49 36,46 31,49 33,44 29,41 34,41" fill="#facc15" stroke="#1e293b" strokeWidth="1" />
            <polygon points="64,36 66,41 71,41 67,44 69,49 64,46 59,49 61,44 57,41 62,41" fill="#facc15" stroke="#1e293b" strokeWidth="1" />
          </>
        );
      default:
        return (
          <>
            <circle cx="36" cy="42" r="6" fill="#1e293b" />
            <circle cx="64" cy="42" r="6" fill="#1e293b" />
          </>
        );
    }
  };

  // Mouth variants (index 0 - 5)
  const renderMouth = () => {
    switch (mouth % 6) {
      case 0: // Broad cheerful smile
        return (
          <path d="M 35 60 Q 50 76 65 60" stroke="#1e293b" strokeWidth="3.5" strokeLinecap="round" fill="none" />
        );
      case 1: // Big open mouth with teeth
        return (
          <g>
            <path d="M 36 58 Q 50 78 64 58 Z" fill="#b91c1c" stroke="#1e293b" strokeWidth="2.5" />
            <path d="M 38 58 Q 50 63 62 58 Z" fill="#ffffff" />
          </g>
        );
      case 2: // Silly tongue sticking out :P
        return (
          <g>
            <path d="M 36 60 Q 50 68 64 60" stroke="#1e293b" strokeWidth="3" strokeLinecap="round" fill="none" />
            <path d="M 45 64 Q 50 77 55 64 Z" fill="#f43f5e" stroke="#1e293b" strokeWidth="1.5" />
          </g>
        );
      case 3: // Surprised 'O'
        return (
          <ellipse cx="50" cy="64" rx="6" ry="8" fill="#1e293b" />
        );
      case 4: // Smirk / cheeky smile
        return (
          <path d="M 38 64 Q 52 68 64 58" stroke="#1e293b" strokeWidth="3.5" strokeLinecap="round" fill="none" />
        );
      case 5: // Mustache face
        return (
          <g>
            <path d="M 50 60 C 45 54 34 54 30 62 C 38 64 45 63 50 65 C 55 63 62 64 70 62 C 66 54 55 54 50 60 Z" fill="#1e293b" />
            <path d="M 42 68 Q 50 72 58 68" stroke="#1e293b" strokeWidth="2" strokeLinecap="round" fill="none" />
          </g>
        );
      default:
        return (
          <path d="M 38 60 Q 50 72 62 60" stroke="#1e293b" strokeWidth="3" strokeLinecap="round" fill="none" />
        );
    }
  };

  return (
    <div
      className={`relative inline-flex items-center justify-center shrink-0 ${className}`}
      style={{ width: size, height: size }}
    >
      {showCrown && (
        <span
          className="absolute -top-3 -right-2 text-yellow-400 drop-shadow-md z-10 animate-bounce-subtle"
          style={{ fontSize: size * 0.4 }}
          title="Room Host"
        >
          👑
        </span>
      )}
      <svg
        viewBox="0 0 100 100"
        className="w-full h-full drop-shadow-sm select-none"
        xmlns="http://www.w3.org/2000/svg"
      >
        {/* Head Base */}
        <circle
          cx="50"
          cy="50"
          r="44"
          fill={color}
          stroke="#0f172a"
          strokeWidth="4"
        />

        {/* Blush cheeks */}
        <circle cx="26" cy="52" r="5" fill="#f43f5e" opacity="0.3" />
        <circle cx="74" cy="52" r="5" fill="#f43f5e" opacity="0.3" />

        {/* Face features */}
        {renderEyes()}
        {renderMouth()}
      </svg>
    </div>
  );
};
