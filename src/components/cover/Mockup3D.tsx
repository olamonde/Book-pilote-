import React, { useState, useRef, useEffect, useMemo } from 'react';
import { CoverConfig, MockupMode } from '../../types';
import { CoverRenderer } from './CoverRenderer';
import { BookOpen, Layers, Monitor, Smartphone, Tablet, RotateCcw, Sparkles, ShieldCheck } from 'lucide-react';

interface Mockup3DProps {
  cover: CoverConfig;
  mode?: MockupMode;
  initialMode?: MockupMode;
  onModeChange?: (mode: MockupMode) => void;
  className?: string;
  showSelector?: boolean;
  thickness?: number; // 16 to 64px
  shadowIntensity?: number; // 0.2 to 1.0
  allowInteraction?: boolean;
}

export const Mockup3D: React.FC<Mockup3DProps> = ({
  cover,
  mode: controlledMode,
  initialMode = 'standing',
  onModeChange,
  className = '',
  showSelector = false,
  thickness: propThickness = 36,
  shadowIntensity = 0.6,
  allowInteraction = true
}) => {
  const [internalMode, setInternalMode] = useState<MockupMode>(controlledMode || initialMode);
  const activeMode = controlledMode || internalMode;

  // Clamped & validated thickness
  const thickness = Math.max(16, Math.min(64, propThickness));

  // Interactive 3D drag rotation state
  const [rotationOffset, setRotationOffset] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const dragStartRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const currentOffsetRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });

  // Mode preset angles
  const presetAngles = useMemo(() => {
    switch (activeMode) {
      case 'standing':
        return { rotY: -26, rotX: 7, rotZ: 0 };
      case 'perspective':
        return { rotY: -34, rotX: 18, rotZ: 5 };
      case 'desk':
        return { rotY: 0, rotX: 52, rotZ: -24 };
      case 'floating':
        return { rotY: -20, rotX: 10, rotZ: 2 };
      default:
        return { rotY: -26, rotX: 7, rotZ: 0 };
    }
  }, [activeMode]);

  // Reset interactive rotation when mode changes
  useEffect(() => {
    setRotationOffset({ x: 0, y: 0 });
    currentOffsetRef.current = { x: 0, y: 0 };
  }, [activeMode]);

  const handleModeSelect = (newMode: MockupMode) => {
    if (!controlledMode) {
      setInternalMode(newMode);
    }
    if (onModeChange) onModeChange(newMode);
  };

  // Mouse / touch drag handlers for interactive 3D inspection
  const handlePointerDown = (e: React.PointerEvent) => {
    if (!allowInteraction || activeMode === 'mobile' || activeMode === 'tablet') return;
    setIsDragging(true);
    dragStartRef.current = { x: e.clientX, y: e.clientY };
    (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!isDragging) return;
    const deltaX = (e.clientX - dragStartRef.current.x) * 0.4;
    const deltaY = (e.clientY - dragStartRef.current.y) * -0.4;

    const newX = Math.max(-60, Math.min(60, currentOffsetRef.current.x + deltaY));
    const newY = Math.max(-90, Math.min(90, currentOffsetRef.current.y + deltaX));

    setRotationOffset({ x: newX, y: newY });
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    if (!isDragging) return;
    setIsDragging(false);
    currentOffsetRef.current = rotationOffset;
    (e.target as HTMLElement).releasePointerCapture?.(e.pointerId);
  };

  const handleResetRotation = () => {
    setRotationOffset({ x: 0, y: 0 });
    currentOffsetRef.current = { x: 0, y: 0 };
  };

  // Physical Dimensions (in pixels) for true 3D book construction
  const BOOK_WIDTH = 220; // Exact 2:3 ratio
  const BOOK_HEIGHT = 330;
  const COVER_OVERHANG = 3; // 3px hardcover overhang (la chasse du livre)
  const PAGE_BLOCK_WIDTH = BOOK_WIDTH - COVER_OVERHANG;
  const PAGE_BLOCK_HEIGHT = BOOK_HEIGHT - COVER_OVERHANG * 2;
  const PAGE_BLOCK_THICKNESS = thickness - 4; // Recessed slightly inside cover boards

  const finalRotX = presetAngles.rotX + rotationOffset.x;
  const finalRotY = presetAngles.rotY + rotationOffset.y;
  const finalRotZ = presetAngles.rotZ;

  // Auto-validation of 3D Book parameters
  const isGeometryValid =
    BOOK_WIDTH > 0 &&
    BOOK_HEIGHT > 0 &&
    thickness >= 16 &&
    thickness <= 64 &&
    !isNaN(finalRotX) &&
    !isNaN(finalRotY);

  return (
    <div className={`flex flex-col items-center justify-center select-none ${className}`}>
      {/* 3D Scene Viewport */}
      <div
        className="relative w-full min-h-[440px] sm:min-h-[480px] flex items-center justify-center p-6 sm:p-10 overflow-hidden rounded-3xl"
        style={{
          perspective: '1300px',
          touchAction: 'none'
        }}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
      >
        {/* Subtle radial ambient atmosphere glow matching book theme */}
        <div
          className="absolute w-80 h-80 rounded-full blur-[110px] opacity-25 pointer-events-none transition-all duration-700"
          style={{ backgroundColor: cover.secondaryColor || '#8b5cf6' }}
        />

        {/* ============================================================ */}
        {/* PHYSICAL 3D BOOK ENGINE (Used for standing, perspective, desk, floating) */}
        {/* ============================================================ */}
        {activeMode !== 'mobile' && activeMode !== 'tablet' && isGeometryValid && (
          <div
            className={activeMode === 'floating' ? 'animate-book-float' : ''}
            style={{ transformStyle: 'preserve-3d' }}
          >
            <div
              className={`relative transition-transform duration-300 ease-out cursor-grab ${
                isDragging ? 'cursor-grabbing' : ''
              }`}
              style={{
                width: `${BOOK_WIDTH}px`,
                height: `${BOOK_HEIGHT}px`,
                transformStyle: 'preserve-3d',
                transform: `rotateX(${finalRotX}deg) rotateY(${finalRotY}deg) rotateZ(${finalRotZ}deg)`
              }}
            >
            {/* 1. FRONT COVER (Couverture avant rigide) */}
            <div
              className="absolute inset-0 rounded-r-[4px] overflow-hidden"
              style={{
                width: `${BOOK_WIDTH}px`,
                height: `${BOOK_HEIGHT}px`,
                transformStyle: 'preserve-3d',
                transform: `translateZ(${thickness / 2}px)`,
                backfaceVisibility: 'hidden',
                boxShadow: 'inset 0 0 0 1px rgba(255,255,255,0.12)'
              }}
            >
              <CoverRenderer
                cover={cover}
                size="custom"
                showSpineShadow={false}
                className="w-full h-full"
              />

              {/* Spine Hinge Groove (Mors du livre) - realistic embossed shadow crease */}
              <div
                className="absolute top-0 bottom-0 left-[10px] w-[3px] pointer-events-none z-30"
                style={{
                  background:
                    'linear-gradient(to right, rgba(0,0,0,0.55), rgba(0,0,0,0.2) 60%, rgba(255,255,255,0.12) 100%)',
                  boxShadow: '1px 0 2px rgba(0,0,0,0.35)'
                }}
              />

              {/* Subtle dynamic specular sheen across front cover */}
              <div
                className="absolute inset-0 pointer-events-none z-20"
                style={{
                  background:
                    'linear-gradient(115deg, rgba(255,255,255,0.14) 0%, transparent 40%, rgba(255,255,255,0.03) 65%, transparent 100%)'
                }}
              />
            </div>

            {/* 2. BOOK SPINE (Dos du livre - Left 3D facet connecting front & back) */}
            <div
              className="absolute top-0 left-0 flex flex-col justify-between items-center py-5 px-1 overflow-hidden"
              style={{
                width: `${thickness}px`,
                height: `${BOOK_HEIGHT}px`,
                transformStyle: 'preserve-3d',
                transform: `translateX(-${thickness / 2}px) rotateY(-90deg)`,
                background: `linear-gradient(to right, #050608 0%, ${cover.primaryColor || '#0a0a0f'} 40%, ${cover.secondaryColor || '#1e1b4b'}40 55%, #050608 100%)`,
                boxShadow:
                  'inset 0 0 8px rgba(0,0,0,0.8), inset 1px 0 0 rgba(255,255,255,0.15), inset -1px 0 0 rgba(0,0,0,0.6)',
                borderRight: '1px solid rgba(0,0,0,0.6)'
              }}
            >
              {/* Top spine logo / imprint */}
              <div className="flex flex-col items-center gap-1 opacity-80 pt-1">
                <div
                  className="w-2.5 h-2.5 rounded-xs rotate-45 border"
                  style={{ borderColor: cover.accentColor || '#38bdf8' }}
                />
                <span className="text-[6px] tracking-widest text-slate-400 font-mono">PILOT</span>
              </div>

              {/* Vertical Title & Author in Spine */}
              <div className="flex-1 flex items-center justify-center my-4 overflow-hidden">
                <div
                  className="transform rotate-90 origin-center whitespace-nowrap text-center max-w-[200px]"
                  style={{
                    color: cover.textColor || '#ffffff',
                    textShadow: '0 1px 3px rgba(0,0,0,0.9)'
                  }}
                >
                  <span className="text-[9px] font-bold tracking-wider uppercase font-sans">
                    {cover.title || 'Livre'}
                  </span>
                  <span className="mx-2 text-[8px] opacity-40 font-mono">•</span>
                  <span className="text-[8px] font-medium tracking-wide opacity-80">
                    {cover.author || 'Auteur'}
                  </span>
                </div>
              </div>

              {/* Bottom spine edition mark */}
              <div className="text-[6px] font-mono tracking-tighter text-slate-400 opacity-60 pb-1">
                BP-ED1
              </div>
            </div>

            {/* 3. FORE-EDGE PAGE BLOCK (Tranche latérale droite des pages) */}
            <div
              className="absolute overflow-hidden"
              style={{
                top: `${COVER_OVERHANG}px`,
                right: `${COVER_OVERHANG}px`,
                width: `${PAGE_BLOCK_THICKNESS}px`,
                height: `${PAGE_BLOCK_HEIGHT}px`,
                transform: `translateX(${PAGE_BLOCK_THICKNESS / 2}px) rotateY(90deg)`,
                background:
                  'repeating-linear-gradient(to right, #faf7f0 0px, #e7e2d4 1px, #f5f1e6 2px, #dcd5c3 3px)',
                boxShadow:
                  'inset 0 0 10px rgba(0,0,0,0.4), inset 2px 0 4px rgba(0,0,0,0.25), inset -2px 0 4px rgba(0,0,0,0.25)'
              }}
            >
              {/* Paper block concave curve shadow */}
              <div
                className="w-full h-full pointer-events-none"
                style={{
                  background:
                    'linear-gradient(to bottom, rgba(0,0,0,0.15) 0%, transparent 8%, transparent 92%, rgba(0,0,0,0.2) 100%)'
                }}
              />
            </div>

            {/* 4. TOP PAGE BLOCK (Tranche supérieure / tête du livre) */}
            <div
              className="absolute overflow-hidden"
              style={{
                top: `${COVER_OVERHANG}px`,
                left: `${COVER_OVERHANG + 1}px`,
                width: `${PAGE_BLOCK_WIDTH - 2}px`,
                height: `${PAGE_BLOCK_THICKNESS}px`,
                transform: `translateY(-${PAGE_BLOCK_THICKNESS / 2}px) rotateX(90deg)`,
                background:
                  'repeating-linear-gradient(to bottom, #faf7f0 0px, #e7e2d4 1px, #f5f1e6 2px, #ded8c7 3px)',
                boxShadow:
                  'inset 0 0 8px rgba(0,0,0,0.35), inset 0 2px 3px rgba(0,0,0,0.2)'
              }}
            >
              {/* Spine edge shadow on top paper face */}
              <div
                className="w-full h-full pointer-events-none"
                style={{
                  background:
                    'linear-gradient(to right, rgba(0,0,0,0.45) 0%, rgba(0,0,0,0.1) 15%, transparent 35%)'
                }}
              />
            </div>

            {/* 5. BOTTOM PAGE BLOCK (Tranche inférieure / pied du livre) */}
            <div
              className="absolute overflow-hidden"
              style={{
                bottom: `${COVER_OVERHANG}px`,
                left: `${COVER_OVERHANG + 1}px`,
                width: `${PAGE_BLOCK_WIDTH - 2}px`,
                height: `${PAGE_BLOCK_THICKNESS}px`,
                transform: `translateY(${PAGE_BLOCK_THICKNESS / 2}px) rotateX(-90deg)`,
                background:
                  'repeating-linear-gradient(to top, #f4f0e6 0px, #e2ddd0 1px, #f0ebe0 2px, #d5cebc 3px)',
                boxShadow:
                  'inset 0 0 10px rgba(0,0,0,0.5), inset 0 -2px 4px rgba(0,0,0,0.3)'
              }}
            />

            {/* 6. BACK COVER (Couverture arrière rigide) */}
            <div
              className="absolute inset-0 rounded-l-[4px] overflow-hidden"
              style={{
                width: `${BOOK_WIDTH}px`,
                height: `${BOOK_HEIGHT}px`,
                transform: `translateZ(-${thickness / 2}px) rotateY(180deg)`,
                background: `linear-gradient(135deg, ${cover.primaryColor || '#0a0a0f'} 0%, #050608 100%)`,
                boxShadow:
                  'inset 0 0 0 1px rgba(255,255,255,0.08), inset 0 0 30px rgba(0,0,0,0.7)'
              }}
            >
              {/* Back cover subtle design & ISBN barcode mockup */}
              <div className="w-full h-full p-6 flex flex-col justify-between items-center text-center opacity-70">
                <div className="pt-4">
                  <span className="text-[7px] font-mono tracking-widest text-slate-400 uppercase">
                    Book Pilot Editions
                  </span>
                </div>
                <div className="max-w-[140px] space-y-1">
                  <div className="h-1 bg-white/10 rounded w-full" />
                  <div className="h-1 bg-white/10 rounded w-4/5 mx-auto" />
                  <div className="h-1 bg-white/10 rounded w-3/4 mx-auto" />
                </div>
                {/* Barcode */}
                <div className="p-1.5 bg-white/5 rounded border border-white/10 flex flex-col items-center">
                  <div className="flex gap-[2px] h-5 items-end">
                    {[3, 1, 4, 1, 5, 9, 2, 6, 5, 3, 5, 8, 9, 7].map((h, idx) => (
                      <div
                        key={idx}
                        className="bg-white/60 w-[1.5px]"
                        style={{ height: `${8 + (h % 7) * 2}px` }}
                      />
                    ))}
                  </div>
                  <span className="text-[5px] font-mono text-white/50 mt-0.5 tracking-tighter">
                    978-2-04-733892-1
                  </span>
                </div>
              </div>
            </div>

            {/* 7. REALISTIC FLOOR CAST SHADOW & CONTACT OCCLUSION */}
            <div
              className="absolute pointer-events-none transition-all duration-300"
              style={{
                width: `${BOOK_WIDTH * 1.3}px`,
                height: `${thickness * 1.8}px`,
                bottom: activeMode === 'floating' ? '-55px' : '-22px',
                left: `-${BOOK_WIDTH * 0.15}px`,
                background: `radial-gradient(ellipse at 50% 50%, rgba(0,0,0,${
                  shadowIntensity * 0.95
                }) 0%, rgba(0,0,0,${shadowIntensity * 0.5}) 40%, transparent 75%)`,
                filter: activeMode === 'floating' ? 'blur(16px)' : 'blur(8px)',
                transform: `rotateX(90deg) translateZ(-${
                  activeMode === 'floating' ? '40px' : '8px'
                })`
              }}
            />

            {/* Sharp contact occlusion shadow directly under book spine/base */}
            {activeMode !== 'floating' && (
              <div
                className="absolute pointer-events-none"
                style={{
                  width: `${BOOK_WIDTH * 1.05}px`,
                  height: '8px',
                  bottom: '-4px',
                  left: '0px',
                  background: `rgba(0, 0, 0, ${shadowIntensity * 0.9})`,
                  filter: 'blur(3px)',
                  transform: 'rotateX(85deg)'
                }}
              />
            )}
            </div>
          </div>
        )}

        {/* ============================================================ */}
        {/* MODE 5: MOBILE SMARTPHONE E-READER */}
        {/* ============================================================ */}
        {activeMode === 'mobile' && (
          <div className="relative w-[220px] h-[430px] bg-[#0c0e14] border-[7px] border-slate-800 rounded-[40px] p-2 shadow-2xl flex flex-col items-center justify-between ring-1 ring-white/20 transition-all duration-500 hover:scale-105">
            {/* Speaker & Dynamic Island */}
            <div className="w-18 h-4 bg-slate-850 rounded-full mb-1 flex items-center justify-center gap-1.5 px-2">
              <div className="w-2 h-2 rounded-full bg-slate-700" />
              <div className="w-6 h-1 rounded-full bg-slate-600" />
            </div>
            {/* Smartphone Display Screen */}
            <div className="w-full h-full rounded-[28px] overflow-hidden flex flex-col bg-slate-950 relative border border-white/5 shadow-inner">
              <div className="h-5 px-3 flex items-center justify-between text-[8px] text-slate-400 bg-slate-900/70 border-b border-white/5">
                <span>09:41</span>
                <span>100%</span>
              </div>
              <div className="flex-1 flex items-center justify-center p-2">
                <CoverRenderer
                  cover={cover}
                  size="custom"
                  className="w-full h-full rounded-md shadow-xl"
                  showSpineShadow={false}
                />
              </div>
            </div>
            {/* Bottom Home Indicator bar */}
            <div className="w-20 h-1 bg-slate-600 rounded-full mt-1.5" />
          </div>
        )}

        {/* ============================================================ */}
        {/* MODE 6: TABLET DIGITAL READER */}
        {/* ============================================================ */}
        {activeMode === 'tablet' && (
          <div className="relative w-[290px] sm:w-[330px] h-[410px] bg-slate-900 border-[10px] border-slate-800 rounded-[30px] p-2 shadow-2xl flex flex-col items-center justify-center ring-1 ring-white/15 transition-all duration-500 hover:scale-105">
            {/* Front Camera */}
            <div className="absolute top-2 w-2 h-2 rounded-full bg-slate-700" />
            {/* Tablet Screen */}
            <div className="w-full h-full rounded-[20px] overflow-hidden flex items-center justify-center bg-slate-950 p-3 border border-white/5">
              <CoverRenderer
                cover={cover}
                size="md"
                className="rounded-md shadow-2xl"
                showSpineShadow={false}
              />
            </div>
          </div>
        )}

        {/* Rotation Hint & Reset overlay button (for interactive 3D inspection) */}
        {allowInteraction && activeMode !== 'mobile' && activeMode !== 'tablet' && (
          <div className="absolute bottom-3 left-4 right-4 flex items-center justify-between pointer-events-none">
            <span className="text-[10px] font-mono text-slate-500/80 tracking-wide flex items-center gap-1.5">
              <Sparkles className="w-3 h-3 text-purple-400" />
              <span>Glissez pour faire pivoter le livre en 3D</span>
            </span>

            {(rotationOffset.x !== 0 || rotationOffset.y !== 0) && (
              <button
                onClick={handleResetRotation}
                className="pointer-events-auto text-[10px] font-mono text-purple-400 hover:text-purple-300 bg-purple-950/60 hover:bg-purple-900/60 border border-purple-500/30 px-2.5 py-1 rounded-lg flex items-center gap-1 transition shadow"
                title="Réinitialiser l'angle"
              >
                <RotateCcw className="w-3 h-3" />
                <span>Angle initial</span>
              </button>
            )}
          </div>
        )}
      </div>

      {/* Optional In-Component Mode Selector */}
      {showSelector && (
        <div className="mt-5 flex flex-wrap items-center justify-center gap-2 p-1.5 rounded-2xl bg-slate-900/80 border border-white/10 backdrop-blur-md">
          {[
            { id: 'standing' as MockupMode, label: 'Livre Debout', icon: BookOpen },
            { id: 'perspective' as MockupMode, label: 'Perspective 3/4', icon: Layers },
            { id: 'desk' as MockupMode, label: 'Sur Table', icon: Monitor },
            { id: 'floating' as MockupMode, label: 'Lévitation', icon: Sparkles },
            { id: 'tablet' as MockupMode, label: 'Tablette', icon: Tablet },
            { id: 'mobile' as MockupMode, label: 'Mobile', icon: Smartphone }
          ].map((item) => {
            const isSelected = activeMode === item.id;
            const Icon = item.icon;
            return (
              <button
                key={item.id}
                onClick={() => handleModeSelect(item.id)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition ${
                  isSelected
                    ? 'bg-purple-600 text-white shadow-md shadow-purple-600/30'
                    : 'text-slate-400 hover:text-white hover:bg-white/5'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{item.label}</span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
};
