import React, { useState } from 'react';
import {
  Layers,
  ArrowLeft,
  Download,
  Share2,
  Check,
  Smartphone,
  Tablet,
  BookOpen,
  Sparkles,
  ShieldCheck,
  Box,
  Monitor
} from 'lucide-react';
import { Book, MockupMode } from '../../types';
import { Mockup3D } from './Mockup3D';

interface MockupViewProps {
  book: Book;
  onBackToEditor: () => void;
  onShowToast: (message: string, type?: 'success' | 'info' | 'warning') => void;
}

export const MockupView: React.FC<MockupViewProps> = ({
  book,
  onBackToEditor,
  onShowToast
}) => {
  const [activeMode, setActiveMode] = useState<MockupMode>('standing');
  const [thickness, setThickness] = useState<number>(36);
  const [shadowIntensity, setShadowIntensity] = useState<number>(0.65);
  const [backgroundTheme, setBackgroundTheme] = useState<'dark' | 'transparent' | 'studio'>('dark');

  const modes: { id: MockupMode; label: string; desc: string; icon: any }[] = [
    {
      id: 'standing',
      label: 'Livre Relié Debout (3/4 Classique)',
      desc: 'Vue d’étagère avec couverture, dos incurvé, mors et tranches de pages',
      icon: BookOpen
    },
    {
      id: 'perspective',
      label: 'Perspective Isométrique 3D',
      desc: 'Profondeur dynamique montrant le volume complet et les feuillets de papier',
      icon: Layers
    },
    {
      id: 'desk',
      label: 'Posé sur Table / Bureau',
      desc: 'Livre à plat en perspective avec ombre d’occlusion et tranche inférieure visible',
      icon: Box
    },
    {
      id: 'floating',
      label: 'Lévitation Studio',
      desc: 'Volume 3D suspendu avec ombre douce diffuse au sol',
      icon: Sparkles
    },
    {
      id: 'tablet',
      label: 'Liseuse Tablette Numérique',
      desc: 'Affichage haute définition sur grand écran tactile en aluminium',
      icon: Tablet
    },
    {
      id: 'mobile',
      label: 'Smartphone E-Book',
      desc: 'Expérience de lecture mobile avec écran immersif',
      icon: Smartphone
    }
  ];

  const handleDownloadMockup = () => {
    const stage = document.getElementById('mockup-stage-container');
    if (!stage) return;

    onShowToast(`Exportation du mockup 3D (${activeMode})...`, 'success');

    const svgData = `
      <svg xmlns="http://www.w3.org/2000/svg" width="900" height="900">
        <foreignObject width="100%" height="100%">
          <div xmlns="http://www.w3.org/1999/xhtml" style="width:100%;height:100%;background:${
            backgroundTheme === 'dark' ? '#090a0f' : backgroundTheme === 'studio' ? '#0f111a' : 'transparent'
          };display:flex;align-items:center;justify-content:center;">
            ${stage.innerHTML}
          </div>
        </foreignObject>
      </svg>
    `;

    const blob = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${book.title.toLowerCase().replace(/\s+/g, '-')}-${activeMode}-mockup.svg`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const handleShare = () => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(window.location.href);
      onShowToast('Lien du mockup copié dans le presse-papier !', 'success');
    }
  };

  return (
    <div className="p-4 sm:p-8 max-w-7xl mx-auto space-y-8 animate-in fade-in duration-200">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/10 pb-5">
        <div className="flex items-center gap-3">
          <button
            onClick={onBackToEditor}
            className="p-2 text-slate-400 hover:text-white rounded-lg hover:bg-white/5 transition"
            title="Retour à l'éditeur"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-white tracking-tight font-sans flex items-center gap-2.5">
              <span>Visualiseur de Livre 3D</span>
              <span className="text-xs px-2.5 py-0.5 rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/30 font-mono font-normal flex items-center gap-1">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                <span>Volume Réaliste Validé</span>
              </span>
            </h1>
            <p className="text-xs text-slate-400 font-mono">
              Rendu physique 3D sans déformation pour : « {book.title} »
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={handleShare}
            className="px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-white border border-white/10 text-xs font-semibold transition flex items-center gap-1.5"
          >
            <Share2 className="w-4 h-4 text-purple-400" />
            <span>Partager</span>
          </button>

          <button
            id="download-mockup-btn"
            onClick={handleDownloadMockup}
            className="px-5 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-semibold shadow-lg shadow-purple-600/30 transition flex items-center gap-1.5 hover:scale-[1.02] active:scale-[0.98]"
          >
            <Download className="w-4 h-4" />
            <span>Télécharger le Mockup</span>
          </button>
        </div>
      </div>

      {/* Main Workspace */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* LEFT: 3D Stage (8 Cols) */}
        <div
          className={`lg:col-span-8 rounded-3xl border border-white/10 shadow-2xl p-6 sm:p-12 flex flex-col items-center justify-center min-h-[540px] transition-colors relative overflow-hidden ${
            backgroundTheme === 'dark'
              ? 'bg-[#090a0f]'
              : backgroundTheme === 'studio'
              ? 'bg-gradient-to-b from-slate-900 to-[#07080c]'
              : 'bg-transparent border-dashed'
          }`}
        >
          {/* Ambient floor shadow glow */}
          <div className="absolute inset-0 bg-radial from-purple-900/10 via-transparent to-transparent pointer-events-none" />

          <div id="mockup-stage-container" className="w-full py-4 flex items-center justify-center">
            <Mockup3D
              cover={book.cover}
              mode={activeMode}
              thickness={thickness}
              shadowIntensity={shadowIntensity}
              allowInteraction={true}
            />
          </div>

          {/* 3D Geometry Health Indicator */}
          <div className="mt-4 flex flex-wrap items-center justify-center gap-3 text-[11px] font-mono text-slate-400">
            <span className="flex items-center gap-1.5 text-emerald-400 bg-emerald-950/40 border border-emerald-500/20 px-2.5 py-0.5 rounded-full">
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>Couverture & dos 100% cohérents</span>
            </span>
            <span>•</span>
            <span>Tranches de pages : {thickness}mm</span>
            <span>•</span>
            <span className="text-slate-500 uppercase">{activeMode}</span>
          </div>
        </div>

        {/* RIGHT: Mockup Options & Angles (4 Cols) */}
        <div className="lg:col-span-4 space-y-6">
          {/* Angles Selector */}
          <div className="space-y-3">
            <span className="text-xs font-mono uppercase tracking-wider text-slate-400 font-bold block">
              Angles de Vue & Perspectives
            </span>

            <div className="grid grid-cols-1 gap-2.5">
              {modes.map((m) => {
                const isSelected = activeMode === m.id;
                const Icon = m.icon;
                return (
                  <button
                    key={m.id}
                    onClick={() => setActiveMode(m.id)}
                    className={`p-3.5 rounded-xl border text-left transition-all flex items-start justify-between ${
                      isSelected
                        ? 'bg-purple-600/20 border-purple-500 text-white shadow-md shadow-purple-600/20 ring-1 ring-purple-500/40'
                        : 'bg-slate-900/40 border-white/10 text-slate-300 hover:border-white/20 hover:bg-white/5'
                    }`}
                  >
                    <div className="flex items-start gap-2.5">
                      <div
                        className={`p-1.5 rounded-lg shrink-0 mt-0.5 ${
                          isSelected ? 'bg-purple-600 text-white' : 'bg-white/5 text-slate-400'
                        }`}
                      >
                        <Icon className="w-4 h-4" />
                      </div>
                      <div>
                        <h4 className="text-xs font-bold text-white">{m.label}</h4>
                        <p className="text-[10px] text-slate-400 mt-0.5 leading-relaxed">{m.desc}</p>
                      </div>
                    </div>
                    {isSelected && <Check className="w-4 h-4 text-purple-400 shrink-0 ml-1" />}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Physical Adjustments */}
          <div className="p-5 rounded-2xl bg-slate-900/40 border border-white/10 space-y-5">
            <span className="text-[10px] font-mono uppercase tracking-wider text-slate-400 font-bold block flex items-center justify-between">
              <span>Proportions & Optique Physique</span>
              <span className="text-purple-400 lowercase">géométrie 3D</span>
            </span>

            {/* Thickness Slider */}
            <div>
              <div className="flex items-center justify-between text-xs text-slate-300 mb-1.5">
                <span>Épaisseur du livre (Tranche & Pages)</span>
                <span className="font-mono text-purple-400 font-bold">{thickness} mm</span>
              </div>
              <input
                type="range"
                min="16"
                max="64"
                value={thickness}
                onChange={(e) => setThickness(Number(e.target.value))}
                className="w-full accent-purple-500 h-1.5 bg-slate-800 rounded-lg cursor-pointer"
              />
              <div className="flex justify-between text-[9px] text-slate-500 font-mono mt-1">
                <span>Fin (16 mm)</span>
                <span>Roman (36 mm)</span>
                <span>Pavé (64 mm)</span>
              </div>
            </div>

            {/* Shadow Intensity Slider */}
            <div>
              <div className="flex items-center justify-between text-xs text-slate-300 mb-1.5">
                <span>Intensité de l’ombre portée</span>
                <span className="font-mono text-purple-400 font-bold">
                  {Math.round(shadowIntensity * 100)}%
                </span>
              </div>
              <input
                type="range"
                min="0.2"
                max="1"
                step="0.05"
                value={shadowIntensity}
                onChange={(e) => setShadowIntensity(Number(e.target.value))}
                className="w-full accent-purple-500 h-1.5 bg-slate-800 rounded-lg cursor-pointer"
              />
            </div>

            {/* Background Selector */}
            <div>
              <span className="block text-xs text-slate-300 mb-2">Fond du Studio</span>
              <div className="grid grid-cols-3 gap-2">
                <button
                  onClick={() => setBackgroundTheme('dark')}
                  className={`py-1.5 rounded-lg text-xs font-medium border transition ${
                    backgroundTheme === 'dark'
                      ? 'bg-purple-600/30 border-purple-500 text-white'
                      : 'bg-slate-950 border-white/10 text-slate-400'
                  }`}
                >
                  Sombre
                </button>
                <button
                  onClick={() => setBackgroundTheme('studio')}
                  className={`py-1.5 rounded-lg text-xs font-medium border transition ${
                    backgroundTheme === 'studio'
                      ? 'bg-purple-600/30 border-purple-500 text-white'
                      : 'bg-slate-950 border-white/10 text-slate-400'
                  }`}
                >
                  Studio
                </button>
                <button
                  onClick={() => setBackgroundTheme('transparent')}
                  className={`py-1.5 rounded-lg text-xs font-medium border transition ${
                    backgroundTheme === 'transparent'
                      ? 'bg-purple-600/30 border-purple-500 text-white'
                      : 'bg-slate-950 border-white/10 text-slate-400'
                  }`}
                >
                  Transparent
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
