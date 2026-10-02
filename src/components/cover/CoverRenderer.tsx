import React from 'react';
import { CoverConfig } from '../../types';

interface CoverRendererProps {
  cover: CoverConfig;
  className?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl' | 'custom';
  showSpineShadow?: boolean;
  forceArtworkOnly?: boolean;
  showTextOverlay?: boolean;
}

export const CoverRenderer: React.FC<CoverRendererProps> = ({
  cover,
  className = '',
  size = 'md',
  showSpineShadow = true,
  forceArtworkOnly = false,
  showTextOverlay
}) => {
  const sizeClasses = {
    sm: 'w-24 h-36 text-[8px] p-2.5',
    md: 'w-36 h-52 text-[10px] p-3.5',
    lg: 'w-52 h-76 text-xs p-5',
    xl: 'w-72 h-104 text-sm p-6',
    custom: 'p-4'
  };

  const getFontClass = (font: CoverConfig['fontFamily']) => {
    switch (font) {
      case 'cinzel':
        return 'font-cinzel tracking-wider';
      case 'serif':
        return 'font-serif-book italic tracking-normal';
      case 'modern':
        return 'font-sans font-extrabold tracking-tight';
      case 'sans':
      default:
        return 'font-sans font-bold tracking-normal';
    }
  };

  // Determine if this is an image-only / artwork-only rendering (no text overlays, no spine, no editorial badges)
  const isPureArtwork =
    forceArtworkOnly ||
    cover.isArtworkOnly === true ||
    cover.displayMode === 'artwork' ||
    showTextOverlay === false ||
    cover.showTextOverlay === false;

  const pattern = cover.pattern || 'geometric';

  // If pure artwork mode with an image, render the pristine visual directly without any book chrome
  if (isPureArtwork && cover.imageUrl) {
    let aspectClass = 'aspect-[3/4]';
    if (cover.aspectRatio === '1:1' || cover.aspectRatio === 'square') {
      aspectClass = 'aspect-square';
    } else if (cover.aspectRatio === '16:9' || cover.aspectRatio === 'landscape') {
      aspectClass = 'aspect-video';
    }

    return (
      <div
        className={`relative rounded-xl overflow-hidden select-none ${aspectClass} transition-all duration-300 ${sizeClasses[size]} ${className}`}
        style={{
          boxShadow: '0 12px 28px -6px rgba(0, 0, 0, 0.7), 0 4px 12px -2px rgba(0,0,0,0.5)',
          contain: 'paint',
          backgroundColor: cover.primaryColor || '#0a0a0f'
        }}
      >
        <img
          src={cover.imageUrl}
          alt={cover.title || 'Illustration générée'}
          referrerPolicy="no-referrer"
          className="w-full h-full object-cover object-center"
        />
      </div>
    );
  }

  return (
    <div
      className={`relative rounded-md overflow-hidden select-none aspect-[2/3] flex flex-col justify-between transition-all duration-300 ${sizeClasses[size]} ${className}`}
      style={{
        background: `radial-gradient(circle at 75% 25%, ${cover.secondaryColor || '#8b5cf6'}25 0%, ${cover.primaryColor || '#090a0f'} 85%), linear-gradient(135deg, ${cover.primaryColor || '#0a0a0f'} 0%, #050508 100%)`,
        color: cover.textColor || '#ffffff',
        boxShadow: '0 12px 28px -6px rgba(0, 0, 0, 0.7), 0 4px 12px -2px rgba(0,0,0,0.5)',
        contain: 'paint'
      }}
    >
      {/* Background Custom Artwork (clean without vignette or glassmorphism panel) */}
      {cover.imageUrl && (
        <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none">
          <img
            src={cover.imageUrl}
            alt={cover.title || 'Couverture de livre'}
            referrerPolicy="no-referrer"
            className="w-full h-full object-cover object-center"
          />
        </div>
      )}

      {/* Background SVG Generative Patterns ONLY when NO custom image is present */}
      {!cover.imageUrl && (
        <div className="absolute inset-0 pointer-events-none overflow-hidden opacity-35">
          {pattern === 'geometric' && (
            <svg className="w-full h-full" viewBox="0 0 200 300" preserveAspectRatio="none">
              <defs>
                <linearGradient id={`grad-${cover.title}`} x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor={cover.secondaryColor || '#8b5cf6'} stopOpacity="0.8" />
                  <stop offset="100%" stopColor={cover.accentColor || '#38bdf8'} stopOpacity="0.1" />
                </linearGradient>
              </defs>
              <polygon points="100,20 180,140 100,260 20,140" fill="none" stroke={`url(#grad-${cover.title})`} strokeWidth="1.5" />
              <circle cx="100" cy="140" r="50" fill="none" stroke={cover.accentColor || '#38bdf8'} strokeWidth="1" strokeDasharray="4 3" />
              <line x1="20" y1="140" x2="180" y2="140" stroke={cover.secondaryColor || '#8b5cf6'} strokeWidth="0.8" opacity="0.4" />
              <line x1="100" y1="20" x2="100" y2="260" stroke={cover.secondaryColor || '#8b5cf6'} strokeWidth="0.8" opacity="0.4" />
            </svg>
          )}

          {pattern === 'lines' && (
            <svg className="w-full h-full" viewBox="0 0 200 300" preserveAspectRatio="none">
              {Array.from({ length: 12 }).map((_, i) => (
                <line
                  key={i}
                  x1={0}
                  y1={i * 26}
                  x2={200}
                  y2={i * 26 + 60}
                  stroke={cover.accentColor || '#fbbf24'}
                  strokeWidth={i % 3 === 0 ? '1.5' : '0.6'}
                  opacity={0.3 + (i % 4) * 0.15}
                />
              ))}
            </svg>
          )}

          {pattern === 'cubes' && (
            <svg className="w-full h-full" viewBox="0 0 200 300">
              <g transform="translate(40, 100)" stroke={cover.secondaryColor || '#3b82f6'} fill="none" strokeWidth="1">
                <polygon points="60,0 120,35 60,70 0,35" fill={`${cover.secondaryColor || '#3b82f6'}15`} />
                <polygon points="0,35 60,70 60,130 0,95" fill={`${cover.secondaryColor || '#3b82f6'}30`} />
                <polygon points="60,70 120,35 120,95 60,130" fill={`${cover.accentColor || '#10b981'}20`} />
              </g>
            </svg>
          )}

          {pattern === 'stars' && (
            <svg className="w-full h-full" viewBox="0 0 200 300">
              {Array.from({ length: 28 }).map((_, i) => {
                const cx = (i * 37) % 190 + 5;
                const cy = (i * 53) % 280 + 10;
                const r = (i % 3) + 0.8;
                return <circle key={i} cx={cx} cy={cy} r={r} fill={cover.accentColor || '#a855f7'} opacity={0.4 + (i % 5) * 0.12} />;
              })}
              <circle cx="100" cy="120" r="45" fill="none" stroke={cover.secondaryColor || '#06b6d4'} strokeWidth="1" opacity="0.6" />
            </svg>
          )}

          {pattern === 'radial' && (
            <svg className="w-full h-full" viewBox="0 0 200 300">
              <circle cx="100" cy="150" r="90" fill="none" stroke={cover.secondaryColor || '#d97706'} strokeWidth="1" opacity="0.25" />
              <circle cx="100" cy="150" r="65" fill="none" stroke={cover.accentColor || '#f59e0b'} strokeWidth="1" strokeDasharray="3 3" opacity="0.4" />
              <circle cx="100" cy="150" r="40" fill="none" stroke={cover.secondaryColor || '#d97706'} strokeWidth="1.2" opacity="0.5" />
            </svg>
          )}

          {(pattern === 'minimal' || pattern === 'waves' || pattern === 'abstract') && (
            <svg className="w-full h-full" viewBox="0 0 200 300" preserveAspectRatio="none">
              <path
                d="M0,80 Q50,40 100,80 T200,80 L200,300 L0,300 Z"
                fill="none"
                stroke={cover.secondaryColor || '#8b5cf6'}
                strokeWidth="1.2"
                opacity="0.3"
              />
              <path
                d="M0,120 Q60,90 120,120 T200,120"
                fill="none"
                stroke={cover.accentColor || '#38bdf8'}
                strokeWidth="0.8"
                opacity="0.25"
              />
            </svg>
          )}
        </div>
      )}

      {/* Spine 3D groove shadow effect on left border (only in book cover mode) */}
      {showSpineShadow && !isPureArtwork && (
        <>
          <div className="absolute left-0 top-0 bottom-0 w-[4px] bg-black/45 z-10 pointer-events-none" />
          <div className="absolute left-[4px] top-0 bottom-0 w-[1.5px] bg-white/10 z-10 pointer-events-none" />
          <div className="absolute left-[5.5px] top-0 bottom-0 w-[6px] bg-gradient-to-r from-black/40 to-transparent z-10 pointer-events-none" />
        </>
      )}

      {/* RENDER EDITORIAL TEXT ONLY IN COVER MODE */}
      {!isPureArtwork && (
        <>
          {/* Top Section: Category / Publisher badge */}
          <div className="relative z-10 pt-1">
            <div className="flex items-center justify-between">
              <span
                className="text-[9px] uppercase tracking-widest font-semibold opacity-90"
                style={{ textShadow: '0 1px 4px rgba(0,0,0,0.9)' }}
              >
                {cover.style || 'Book Pilot'}
              </span>
              <span
                className="text-[8px] tracking-wider opacity-70 uppercase font-mono"
                style={{ textShadow: '0 1px 3px rgba(0,0,0,0.9)' }}
              >
                EDITION I
              </span>
            </div>
          </div>

          {/* Center Section: Main Title & Subtitle */}
          <div className="relative z-10 my-auto py-2 text-center flex flex-col items-center justify-center max-w-full px-1">
            <h3
              className={`leading-tight line-clamp-3 text-balance break-words max-w-full ${getFontClass(
                cover.fontFamily
              )}`}
              style={{
                fontSize:
                  size === 'sm'
                    ? '11px'
                    : size === 'md'
                    ? '15px'
                    : size === 'lg'
                    ? '22px'
                    : '28px',
                textShadow:
                  '0 2px 8px rgba(0,0,0,0.95), 0 4px 20px rgba(0,0,0,0.85), 0 1px 2px rgba(0,0,0,1)'
              }}
            >
              {cover.title || 'Untitled E-Book'}
            </h3>

            {cover.subtitle && (
              <p
                className="mt-1.5 opacity-90 font-sans leading-snug line-clamp-2 break-words max-w-[92%]"
                style={{
                  fontSize:
                    size === 'sm'
                      ? '7px'
                      : size === 'md'
                      ? '9px'
                      : size === 'lg'
                      ? '11px'
                      : '13px',
                  textShadow: '0 1px 6px rgba(0,0,0,0.9), 0 2px 12px rgba(0,0,0,0.8)'
                }}
              >
                {cover.subtitle}
              </p>
            )}

            {/* Delicate decorative divider */}
            <div
              className="w-10 h-[1.5px] my-2 rounded-full opacity-60"
              style={{
                backgroundColor: cover.accentColor || '#38bdf8',
                boxShadow: '0 1px 4px rgba(0,0,0,0.6)'
              }}
            />
          </div>

          {/* Bottom Section: Author Name & Studio Emblem */}
          <div className="relative z-10 pb-1 text-center max-w-full">
            <p
              className="text-[10px] font-semibold tracking-widest uppercase opacity-95 truncate max-w-[90%] mx-auto"
              style={{ textShadow: '0 1px 6px rgba(0,0,0,0.95)' }}
            >
              {cover.author || 'Author Name'}
            </p>
            <p
              className="text-[7px] tracking-widest text-slate-400 mt-0.5 font-mono uppercase"
              style={{ textShadow: '0 1px 4px rgba(0,0,0,0.9)' }}
            >
              Book Pilot Studio
            </p>
          </div>
        </>
      )}
    </div>
  );
};
