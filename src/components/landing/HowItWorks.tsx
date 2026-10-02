import React from 'react';
import { PenTool, Cpu, Palette, DownloadCloud, Sparkles } from 'lucide-react';
import { useTranslation } from '../../i18n';

export const HowItWorks: React.FC = () => {
  const { t } = useTranslation();

  const steps = [
    {
      num: '01',
      title: t('howItWorks.steps.step1.title'),
      subtitle: t('howItWorks.steps.step1.subtitle'),
      desc: t('howItWorks.steps.step1.desc'),
      icon: PenTool,
      accent: 'from-purple-500 to-indigo-500'
    },
    {
      num: '02',
      title: t('howItWorks.steps.step2.title'),
      subtitle: t('howItWorks.steps.step2.subtitle'),
      desc: t('howItWorks.steps.step2.desc'),
      icon: Cpu,
      accent: 'from-indigo-500 to-sky-500'
    },
    {
      num: '03',
      title: t('howItWorks.steps.step3.title'),
      subtitle: t('howItWorks.steps.step3.subtitle'),
      desc: t('howItWorks.steps.step3.desc'),
      icon: Palette,
      accent: 'from-sky-500 to-emerald-500'
    },
    {
      num: '04',
      title: t('howItWorks.steps.step4.title'),
      subtitle: t('howItWorks.steps.step4.subtitle'),
      desc: t('howItWorks.steps.step4.desc'),
      icon: DownloadCloud,
      accent: 'from-emerald-500 to-purple-500'
    }
  ];

  return (
    <section id="how-it-works" className="py-24 border-t border-white/5 relative bg-[#090a0f]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-2xl mx-auto mb-16">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/10 text-indigo-400 text-xs font-semibold uppercase tracking-wider mb-4 border border-indigo-500/20">
            <Sparkles className="w-3.5 h-3.5" />
            {t('howItWorks.badge')}
          </div>
          <h2 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight">
            {t('howItWorks.title')}
          </h2>
          <p className="mt-4 text-slate-400 text-base">
            {t('howItWorks.subtitle')}
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 relative">
          {steps.map((step, idx) => {
            const Icon = step.icon;
            return (
              <div
                key={step.num}
                className="relative p-6 rounded-2xl bg-slate-900/50 border border-white/10 hover:border-purple-500/40 transition-all duration-300 group hover:-translate-y-1.5 shadow-xl flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between mb-6">
                    <span className="text-2xl font-black font-mono text-purple-400/90 group-hover:text-purple-300 transition-colors">
                      {step.num}
                    </span>
                    <div className="w-10 h-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center group-hover:border-purple-500/40 group-hover:bg-purple-500/10 transition-colors">
                      <Icon className="w-5 h-5 text-slate-300 group-hover:text-purple-400" />
                    </div>
                  </div>

                  <h3 className="text-xl font-bold text-white mb-2">{step.title}</h3>
                  <p className="text-sm font-semibold text-purple-300 mb-3">{step.subtitle}</p>
                  <p className="text-xs text-slate-400 leading-relaxed">{step.desc}</p>
                </div>

                <div className="mt-6 pt-4 border-t border-white/5 flex items-center text-[10px] text-slate-500 uppercase tracking-widest font-mono">
                  {t('howItWorks.badge')} • {idx + 1}/4
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
};
