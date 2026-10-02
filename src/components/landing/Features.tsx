import React from 'react';
import {
  Wand2,
  Bot,
  ListTree,
  Palette,
  Layers,
  Edit3,
  FileCheck2,
  FolderKanban,
  Sparkles
} from 'lucide-react';
import { useTranslation } from '../../i18n';

export const Features: React.FC = () => {
  const { t } = useTranslation();

  const features = [
    {
      title: t('features.generator.title'),
      desc: t('features.generator.desc'),
      icon: Wand2,
      badge: t('features.generator.badge')
    },
    {
      title: t('features.copilot.title'),
      desc: t('features.copilot.desc'),
      icon: Bot,
      badge: t('features.copilot.badge')
    },
    {
      title: t('features.structure.title'),
      desc: t('features.structure.desc'),
      icon: ListTree,
      badge: t('features.structure.badge')
    },
    {
      title: t('features.cover.title'),
      desc: t('features.cover.desc'),
      icon: Palette,
      badge: t('features.cover.badge')
    },
    {
      title: t('features.mockups.title'),
      desc: t('features.mockups.desc'),
      icon: Layers,
      badge: t('features.mockups.badge')
    },
    {
      title: t('features.editor.title'),
      desc: t('features.editor.desc'),
      icon: Edit3,
      badge: t('features.editor.badge')
    },
    {
      title: t('features.export.title'),
      desc: t('features.export.desc'),
      icon: FileCheck2,
      badge: t('features.export.badge')
    },
    {
      title: t('features.library.title'),
      desc: t('features.library.desc'),
      icon: FolderKanban,
      badge: t('features.library.badge')
    }
  ];

  return (
    <section id="features" className="py-24 bg-[#08090d] border-t border-white/5 relative">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-3xl mx-auto mb-16">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-purple-500/10 text-purple-400 text-xs font-semibold uppercase tracking-wider mb-4 border border-purple-500/20">
            <Sparkles className="w-3.5 h-3.5" />
            {t('features.badge')}
          </div>
          <h2 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight">
            {t('features.title')}
          </h2>
          <p className="mt-4 text-slate-400 text-base">
            {t('features.subtitle')}
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {features.map((item) => {
            const Icon = item.icon;
            return (
              <div
                key={item.title}
                className="p-6 rounded-2xl bg-slate-900/40 border border-white/10 hover:border-purple-500/30 transition-all duration-300 hover:-translate-y-1 group"
              >
                <div className="flex items-center justify-between mb-4">
                  <div className="w-10 h-10 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400 group-hover:bg-purple-500 group-hover:text-white transition-colors duration-300">
                    <Icon className="w-5 h-5" />
                  </div>
                  <span className="text-[10px] uppercase font-mono tracking-wider text-slate-500 bg-white/5 px-2 py-0.5 rounded">
                    {item.badge}
                  </span>
                </div>
                <h3 className="text-base font-bold text-white mb-2 group-hover:text-purple-300 transition-colors">
                  {item.title}
                </h3>
                <p className="text-xs text-slate-400 leading-relaxed">{item.desc}</p>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
};
