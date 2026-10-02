import React, { useState } from 'react';
import { ArrowRight, Sparkles, Wand2, ShieldCheck, Zap, BookOpen } from 'lucide-react';
import { CoverRenderer } from '../cover/CoverRenderer';
import { CoverConfig } from '../../types';
import { useTranslation } from '../../i18n';

interface HeroProps {
  onStartGeneration: (prompt: string) => void;
}

export const Hero: React.FC<HeroProps> = ({ onStartGeneration }) => {
  const { t } = useTranslation();
  const [prompt, setPrompt] = useState('');

  const sampleIdeas = [
    t('hero.sample1'),
    t('hero.sample2'),
    t('hero.sample3'),
    t('hero.sample4')
  ];

  const handleQuickSelect = (idea: string) => {
    setPrompt(idea);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (prompt.trim()) {
      onStartGeneration(prompt.trim());
    }
  };

  // Sample hero covers for floating 3D showcase
  const heroCovers: CoverConfig[] = [
    {
      title: 'Autonomous Scale',
      subtitle: 'The AI-Powered Company Playbook',
      author: 'Marcus Chen',
      style: 'technology',
      primaryColor: '#05070f',
      secondaryColor: '#8b5cf6',
      accentColor: '#38bdf8',
      pattern: 'geometric',
      fontFamily: 'modern',
      textColor: '#ffffff'
    },
    {
      title: 'The Silent Obsidian',
      subtitle: 'Chronicles of Deep Space Void',
      author: 'Aria Thorne',
      style: 'fantasy',
      primaryColor: '#120b22',
      secondaryColor: '#ec4899',
      accentColor: '#a855f7',
      pattern: 'stars',
      fontFamily: 'cinzel',
      textColor: '#fdf4ff'
    },
    {
      title: 'Dopamine Protocol',
      subtitle: 'Reclaiming Human Focus in Hyper-Speed',
      author: 'Dr. James Vance',
      style: 'luxury',
      primaryColor: '#141416',
      secondaryColor: '#d97706',
      accentColor: '#f59e0b',
      pattern: 'radial',
      fontFamily: 'cinzel',
      textColor: '#fef3c7'
    }
  ];

  return (
    <section className="relative pt-12 pb-24 md:pt-20 md:pb-32 overflow-hidden">
      {/* Background ambient lighting */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[450px] bg-gradient-to-tr from-purple-900/20 via-indigo-900/20 to-sky-900/10 blur-[130px] -z-10 pointer-events-none rounded-full" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-4xl mx-auto">
          {/* Tagline Badge */}
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-purple-500/10 border border-purple-500/20 text-purple-300 text-xs font-medium mb-8 backdrop-blur-md">
            <Sparkles className="w-3.5 h-3.5 text-purple-400" />
            <span className="tracking-wide">{t('hero.badge')}</span>
          </div>

          {/* Main Headline */}
          <h1 className="text-4xl sm:text-6xl lg:text-7xl font-extrabold tracking-tight text-white uppercase text-balance font-sans leading-[1.08]">
            {t('hero.titleMain')} <br className="hidden sm:inline" />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-400 via-indigo-300 to-sky-400">
              {t('hero.titleAccent')}
            </span>
          </h1>

          {/* Subtitle */}
          <p className="mt-6 text-lg sm:text-xl text-slate-300 font-normal max-w-2xl mx-auto leading-relaxed text-balance">
            {t('hero.subtitle')}
          </p>

          {/* Large Central Generation Box */}
          <div className="mt-10 max-w-3xl mx-auto">
            <form
              onSubmit={handleSubmit}
              className="relative p-2 rounded-2xl bg-slate-900/80 border border-white/15 shadow-2xl backdrop-blur-xl focus-within:border-purple-500/80 focus-within:ring-2 focus-within:ring-purple-500/20 transition-all duration-300"
            >
              <div className="relative">
                <textarea
                  id="hero-book-prompt-input"
                  rows={3}
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  placeholder={t('hero.inputPlaceholder')}
                  className="w-full bg-transparent border-0 text-white placeholder-slate-400 text-base sm:text-lg focus:ring-0 focus:outline-hidden resize-none px-4 py-3 leading-relaxed"
                />
              </div>

              <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2 px-2 border-t border-white/5">
                <div className="flex items-center gap-2 text-xs text-purple-400/90 font-mono">
                  <Wand2 className="w-3.5 h-3.5 text-purple-400" />
                  <span>{t('hero.engineNotice')}</span>
                </div>

                <button
                  id="hero-generate-btn"
                  type="submit"
                  disabled={!prompt.trim()}
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl bg-gradient-to-r from-purple-600 via-indigo-600 to-purple-600 hover:from-purple-500 hover:to-indigo-500 text-white font-semibold text-sm shadow-xl shadow-purple-600/30 transition-all duration-200 hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
                >
                  <span>{t('hero.generateBtn')}</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </form>

            {/* Quick Inspiration Pills */}
            <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
              <span className="text-xs text-slate-400">{t('hero.tryIdea')}</span>
              {sampleIdeas.slice(0, 2).map((idea, idx) => (
                <button
                  key={idx}
                  onClick={() => handleQuickSelect(idea)}
                  className="text-xs px-3 py-1 rounded-full bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white border border-white/10 transition truncate max-w-[280px] sm:max-w-none text-left"
                >
                  "{idea.slice(0, 48)}..."
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Floating 3D Book Visuals Section */}
        <div className="mt-16 md:mt-24 relative max-w-5xl mx-auto">
          {/* Subtle floor glow */}
          <div className="absolute inset-x-0 bottom-0 h-36 bg-gradient-to-t from-[#090a0f] to-transparent z-10 pointer-events-none" />

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-8 sm:gap-6 items-center justify-items-center perspective-1400 py-8">
            {/* Left Cover (Angled) */}
            <div className="transform sm:-rotate-y-[20deg] sm:rotate-z-[4deg] hover:rotate-y-0 transition-all duration-500 hover:scale-105 z-10">
              <div className="p-1 rounded-xl bg-gradient-to-b from-white/10 to-transparent shadow-2xl">
                <CoverRenderer cover={heroCovers[0]} size="lg" />
              </div>
            </div>

            {/* Center Cover (Prominent Standout) */}
            <div className="transform sm:-translate-y-6 hover:scale-105 transition-all duration-500 z-20">
              <div className="p-1 rounded-xl bg-gradient-to-b from-purple-500/30 via-indigo-500/10 to-transparent shadow-2xl ring-1 ring-purple-500/30">
                <CoverRenderer cover={heroCovers[1]} size="xl" />
              </div>
            </div>

            {/* Right Cover (Angled) */}
            <div className="transform sm:rotate-y-[20deg] sm:-rotate-z-[4deg] hover:rotate-y-0 transition-all duration-500 hover:scale-105 z-10">
              <div className="p-1 rounded-xl bg-gradient-to-b from-white/10 to-transparent shadow-2xl">
                <CoverRenderer cover={heroCovers[2]} size="lg" />
              </div>
            </div>
          </div>

          {/* Value props micro-bar */}
          <div className="mt-8 flex flex-wrap items-center justify-center gap-8 text-xs font-medium text-slate-400">
            <span className="flex items-center gap-1.5">
              <Zap className="w-4 h-4 text-purple-400" />
              {t('generationProgress.stepChapters')}
            </span>
            <span className="flex items-center gap-1.5">
              <BookOpen className="w-4 h-4 text-indigo-400" />
              {t('features.export.title')}
            </span>
            <span className="flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-sky-400" />
              {t('common.appTagline')}
            </span>
          </div>
        </div>
      </div>
    </section>
  );
};
