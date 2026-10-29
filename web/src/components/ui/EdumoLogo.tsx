import React from 'react';
import { Link } from 'react-router-dom';

interface EdumoLogoProps {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  showText?: boolean;
  showSubtitle?: boolean;
  showBadge?: boolean;
  to?: string;
  className?: string;
}

export const EdumoLogo: React.FC<EdumoLogoProps> = ({
  size = 'md',
  showText = true,
  showSubtitle = false,
  showBadge = false,
  to,
  className = '',
}) => {
  const sizeMap = {
    sm: { icon: 'w-8 h-8', text: 'text-base', sub: 'text-[9px]', badge: 'text-[9px]' },
    md: { icon: 'w-10 h-10', text: 'text-xl', sub: 'text-[10px]', badge: 'text-[10px]' },
    lg: { icon: 'w-14 h-14', text: 'text-2xl', sub: 'text-xs', badge: 'text-xs' },
    xl: { icon: 'w-20 h-20', text: 'text-3xl', sub: 'text-sm', badge: 'text-xs' },
  };

  const currentSize = sizeMap[size];

  // Official EDUMO Emblem (Open Book + Graduation Cap + Rising Sun Wings)
  const EmblemIcon = () => (
    <div
      className={`${currentSize.icon} relative rounded-2xl flex items-center justify-center shrink-0 overflow-hidden shadow-md transition-transform hover:scale-105`}
      style={{
        background: 'linear-gradient(135deg, #1d5f99 0%, #683669 50%, #a5243d 100%)',
        boxShadow: '0 4px 16px rgba(29, 95, 153, 0.3), 0 2px 6px rgba(165, 36, 61, 0.25)',
      }}
    >
      <svg
        viewBox="0 0 100 100"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="w-[85%] h-[85%] drop-shadow"
      >
        <defs>
          <linearGradient id="sunGlow" x1="0%" y1="100%" x2="0%" y2="0%">
            <stop offset="0%" stopColor="#a5243d" />
            <stop offset="100%" stopColor="#ff708d" />
          </linearGradient>
        </defs>

        {/* Rising Sun Rays */}
        <circle cx="50" cy="30" r="13" fill="url(#sunGlow)" opacity="0.9" />
        <path d="M50 14 L52 22 L48 22 Z" fill="#ffffff" opacity="0.9" />
        <path d="M38 18 L43 25 L40 26 Z" fill="#ffffff" opacity="0.9" />
        <path d="M62 18 L60 26 L57 25 Z" fill="#ffffff" opacity="0.9" />

        {/* Left Wing */}
        <path
          d="M20 32 C18 44 24 58 48 61 C32 58 26 44 25 36 Z"
          fill="#5391c7"
          opacity="0.9"
        />
        {/* Right Wing */}
        <path
          d="M80 32 C82 44 76 58 52 61 C68 58 74 44 75 36 Z"
          fill="#5391c7"
          opacity="0.9"
        />

        {/* Mortarboard / Graduation Cap */}
        <polygon points="50,26 68,33 50,40 32,33" fill="#ffffff" />
        <polygon points="50,28 66,33 50,39 34,33" fill="#683669" />
        <path d="M43 38 L43 44 C43 47 46 49 50 49 C54 49 57 47 57 44 L57 38 Z" fill="#ffffff" />
        <path d="M50 33 C55 35 59 38 61 43" stroke="#ffd166" strokeWidth="1.8" strokeLinecap="round" />

        {/* Open Book Base */}
        <path
          d="M50 63 C43 57 33 57 24 60 L24 77 C33 74 43 74 50 80 Z"
          fill="#ffffff"
          opacity="0.95"
        />
        <path
          d="M50 63 C57 57 67 57 76 60 L76 77 C67 74 57 74 50 80 Z"
          fill="#ffffff"
          opacity="0.95"
        />
        {/* Book Spine */}
        <path d="M48.5 54 L51.5 54 L52 80 L48 80 Z" fill="#a5243d" />
      </svg>
    </div>
  );

  const content = (
    <div className={`flex items-center gap-3 select-none ${className}`}>
      <EmblemIcon />

      {showText && (
        <div className="flex flex-col text-left">
          <div className="flex items-center gap-1.5">
            <span
              className={`font-display font-black tracking-tight ${currentSize.text} bg-clip-text text-transparent`}
              style={{
                backgroundImage: 'linear-gradient(to right, #1d5f99 0%, #683669 50%, #a5243d 100%)',
              }}
            >
              EDUMO
            </span>
            {showBadge && (
              <span
                className={`${currentSize.badge} font-bold px-2 py-0.5 rounded-full text-white shadow-xs`}
                style={{
                  background: 'linear-gradient(to right, #1d5f99, #a5243d)',
                }}
              >
                EA
              </span>
            )}
          </div>
          {showSubtitle && (
            <span
              className={`${currentSize.sub} font-semibold uppercase tracking-wider text-[#4b5563]`}
            >
              School Management
            </span>
          )}
        </div>
      )}
    </div>
  );

  if (to) {
    return (
      <Link to={to} className="inline-block transition-opacity hover:opacity-90">
        {content}
      </Link>
    );
  }

  return content;
};
