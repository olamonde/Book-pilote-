import React, { useState } from 'react';
import { CoverRenderer } from '../cover/CoverRenderer';
import { CoverConfig } from '../../types';
import { BookOpen, Sparkles, Filter } from 'lucide-react';
import { useTranslation } from '../../i18n';

interface ShowcaseItem {
  id: string;
  title: string;
  category: string;
  categoryKey?: string;
  chaptersCount: number;
  wordCount: string;
  description: string;
  cover: CoverConfig;
}

interface ShowcaseProps {
  onSelectBookTemplate?: (item: ShowcaseItem) => void;
}

export const Showcase: React.FC<ShowcaseProps> = ({ onSelectBookTemplate }) => {
  const { t } = useTranslation();
  const [activeCategory, setActiveCategory] = useState<string>('All');

  const categories = [
    { key: 'All', label: t('showcase.categories.all') },
    { key: 'Business', label: t('showcase.categories.business') },
    { key: 'Self Improvement', label: t('showcase.categories.selfImprovement') },
    { key: 'Technology', label: t('showcase.categories.technology') },
    { key: 'Marketing', label: t('showcase.categories.marketing') },
    { key: 'Finance', label: t('showcase.categories.finance') },
    { key: 'Fiction', label: t('showcase.categories.fiction') },
    { key: 'Education', label: t('showcase.categories.education') },
    { key: 'Health & Wellness', label: t('showcase.categories.health') }
  ];

  const showcaseBooks: ShowcaseItem[] = [
    {
      id: 'showcase-1',
      title: 'The Lean Velocity Blueprint',
      category: 'Business',
      chaptersCount: 6,
      wordCount: '8,400 words',
      description: 'How modern lean startups execute with zero bloat and compound early traction.',
      cover: {
        title: 'The Lean Velocity Blueprint',
        subtitle: 'From Zero to Market-Dominant Execution',
        author: 'Julian Mercer',
        style: 'business',
        primaryColor: '#0f172a',
        secondaryColor: '#2563eb',
        accentColor: '#10b981',
        pattern: 'cubes',
        fontFamily: 'sans',
        textColor: '#f8fafc'
      }
    },
    {
      id: 'showcase-2',
      title: 'Atomic Momentum',
      category: 'Self Improvement',
      chaptersCount: 5,
      wordCount: '7,100 words',
      description: 'The neurochemistry of deep focus, habit stacking, and sustainable creative endurance.',
      cover: {
        title: 'Atomic Momentum',
        subtitle: 'Neurochemistry of Deep Focus',
        author: 'Dr. Sarah Lin',
        style: 'minimal',
        primaryColor: '#18181b',
        secondaryColor: '#d97706',
        accentColor: '#f59e0b',
        pattern: 'radial',
        fontFamily: 'cinzel',
        textColor: '#fef3c7'
      }
    },
    {
      id: 'showcase-3',
      title: 'Architects of the Autonomous Age',
      category: 'Technology',
      chaptersCount: 7,
      wordCount: '10,200 words',
      description: 'Mastering generative AI agent pipelines, autonomous code bases, and next-gen infrastructure.',
      cover: {
        title: 'Architects of the Autonomous Age',
        subtitle: 'Mastering AI Systems and Autonomous Workflows',
        author: 'Devon Hayes',
        style: 'technology',
        primaryColor: '#05070f',
        secondaryColor: '#8b5cf6',
        accentColor: '#06b6d4',
        pattern: 'lines',
        fontFamily: 'modern',
        textColor: '#ffffff'
      }
    },
    {
      id: 'showcase-4',
      title: 'Algorithmic Distribution',
      category: 'Marketing',
      chaptersCount: 6,
      wordCount: '7,900 words',
      description: 'Engineering viral loops, social momentum, and organic audience acquisition at scale.',
      cover: {
        title: 'Algorithmic Distribution',
        subtitle: 'The Non-Linear Growth Manual',
        author: 'Kaelen Ross',
        style: 'modern',
        primaryColor: '#111827',
        secondaryColor: '#ec4899',
        accentColor: '#a855f7',
        pattern: 'geometric',
        fontFamily: 'modern',
        textColor: '#ffffff'
      }
    },
    {
      id: 'showcase-5',
      title: 'Asymmetrical Capital',
      category: 'Finance',
      chaptersCount: 6,
      wordCount: '8,800 words',
      description: 'Risk parity, defensive assets, and contrarian wealth allocation strategies for modern markets.',
      cover: {
        title: 'Asymmetrical Capital',
        subtitle: 'Contrarian Wealth Protocols',
        author: 'Victor Sterling',
        style: 'luxury',
        primaryColor: '#0b0f19',
        secondaryColor: '#b45309',
        accentColor: '#fbbf24',
        pattern: 'lines',
        fontFamily: 'cinzel',
        textColor: '#fef3c7'
      }
    },
    {
      id: 'showcase-6',
      title: 'Echoes of the Obsidian Drift',
      category: 'Fiction',
      chaptersCount: 8,
      wordCount: '12,500 words',
      description: 'A cybernetic voyage through the dead relays of the Outer Perseus arm.',
      cover: {
        title: 'Echoes of the Obsidian Drift',
        subtitle: 'A Cybernetic Journey Across the Void',
        author: 'Lyra Vance',
        style: 'fantasy',
        primaryColor: '#0c071e',
        secondaryColor: '#7c3aed',
        accentColor: '#38bdf8',
        pattern: 'stars',
        fontFamily: 'cinzel',
        textColor: '#fdf4ff'
      }
    },
    {
      id: 'showcase-7',
      title: 'Accelerated Learning Systems',
      category: 'Education',
      chaptersCount: 5,
      wordCount: '6,900 words',
      description: 'Memory matrices, rapid conceptual chunking, and Feynman synthesis techniques.',
      cover: {
        title: 'Accelerated Learning Systems',
        subtitle: 'The Rapid Skill Acquisition Method',
        author: 'Prof. Nathan Reed',
        style: 'editorial',
        primaryColor: '#1c1917',
        secondaryColor: '#0284c7',
        accentColor: '#38bdf8',
        pattern: 'minimal',
        fontFamily: 'serif',
        textColor: '#f8fafc'
      }
    },
    {
      id: 'showcase-8',
      title: 'The Circadian Reset',
      category: 'Health & Wellness',
      chaptersCount: 6,
      wordCount: '8,100 words',
      description: 'Photonic biology, metabolic timing, and sleep synchronization for peak physical longevity.',
      cover: {
        title: 'The Circadian Reset',
        subtitle: 'Biological Optimization Protocols',
        author: 'Dr. Evelyn Clark',
        style: 'minimal',
        primaryColor: '#06201b',
        secondaryColor: '#059669',
        accentColor: '#34d399',
        pattern: 'radial',
        fontFamily: 'sans',
        textColor: '#ecfdf5'
      }
    }
  ];

  const filteredBooks =
    activeCategory === 'All'
      ? showcaseBooks
      : showcaseBooks.filter((b) => b.category === activeCategory);

  return (
    <section id="examples" className="py-24 bg-[#090a0f] border-t border-white/5">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-2xl mx-auto mb-12">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-sky-500/10 text-sky-400 text-xs font-semibold uppercase tracking-wider mb-4 border border-sky-500/20">
            <Sparkles className="w-3.5 h-3.5" />
            {t('showcase.badge')}
          </div>
          <h2 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight">
            {t('showcase.title')}
          </h2>
          <p className="mt-4 text-slate-400 text-base">
            {t('showcase.subtitle')}
          </p>
        </div>

        {/* Filter Pills */}
        <div className="flex flex-wrap items-center justify-center gap-2 mb-12">
          {categories.map((cat) => (
            <button
              key={cat.key}
              onClick={() => setActiveCategory(cat.key)}
              className={`px-4 py-1.5 rounded-full text-xs font-medium transition-all ${
                activeCategory === cat.key
                  ? 'bg-purple-600 text-white shadow-md shadow-purple-600/30'
                  : 'bg-white/5 text-slate-400 hover:text-white hover:bg-white/10'
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>

        {/* Books Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {filteredBooks.map((item) => (
            <div
              key={item.id}
              className="p-4 rounded-2xl bg-slate-900/40 border border-white/10 hover:border-purple-500/40 transition-all duration-300 group flex flex-col justify-between hover:-translate-y-1 shadow-xl"
            >
              {/* Cover Container */}
              <div className="w-full flex items-center justify-center py-4 bg-black/30 rounded-xl mb-4">
                <div className="transform group-hover:scale-105 transition-transform duration-300">
                  <CoverRenderer cover={item.cover} size="md" />
                </div>
              </div>

              {/* Details */}
              <div className="flex-1 flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between text-[11px] font-mono mb-2">
                    <span className="text-purple-400 font-semibold uppercase">{item.category}</span>
                    <span className="text-slate-500">{item.chaptersCount} {t('common.chapters')}</span>
                  </div>

                  <h3 className="text-base font-bold text-white mb-1.5 line-clamp-1 group-hover:text-purple-300 transition-colors">
                    {item.title}
                  </h3>

                  <p className="text-xs text-slate-400 leading-relaxed line-clamp-2 mb-4">
                    {item.description}
                  </p>
                </div>

                <div className="pt-3 border-t border-white/5 flex items-center justify-between text-xs text-slate-400">
                  <span className="font-mono text-[11px] text-slate-500">{item.wordCount}</span>
                  {onSelectBookTemplate && (
                    <button
                      onClick={() => onSelectBookTemplate(item)}
                      className="text-purple-400 hover:text-purple-300 font-medium text-xs flex items-center gap-1 group/btn"
                    >
                      <span>{t('showcase.useTemplate')}</span>
                      <span className="group-hover/btn:translate-x-0.5 transition-transform">→</span>
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};
