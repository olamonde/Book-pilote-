import React, { useState } from 'react';
import { Check, Sparkles, Zap, Shield, ArrowRight } from 'lucide-react';
import { Plan, User } from '../../types';
import { useTranslation } from '../../i18n';

interface PricingSectionProps {
  currentUser?: User;
  onSelectPlan: (plan: Plan, cycle: 'monthly' | 'yearly') => void;
}

export const PricingSection: React.FC<PricingSectionProps> = ({
  currentUser,
  onSelectPlan
}) => {
  const { t } = useTranslation();
  const [cycle, setCycle] = useState<'monthly' | 'yearly'>('monthly');

  const plans = [
    {
      id: 'free' as Plan,
      name: t('pricing.plans.free.name'),
      monthlyPrice: 0,
      yearlyPrice: 0,
      description: t('pricing.plans.free.desc'),
      popular: false,
      cta: currentUser?.plan === 'free' ? t('pricing.currentPlanBadge') : t('pricing.plans.free.cta'),
      features: [
        t('pricing.plans.free.features.0'),
        t('pricing.plans.free.features.1'),
        t('pricing.plans.free.features.2'),
        t('pricing.plans.free.features.3'),
        t('pricing.plans.free.features.4'),
        t('pricing.plans.free.features.5')
      ]
    },
    {
      id: 'creator' as Plan,
      name: t('pricing.plans.creator.name'),
      monthlyPrice: 12,
      yearlyPrice: 9.6, // $115/yr (~20% off)
      description: t('pricing.plans.creator.desc'),
      popular: true,
      badge: t('pricing.plans.creator.popular'),
      cta: currentUser?.plan === 'creator' ? t('pricing.currentPlanBadge') : t('pricing.plans.creator.cta'),
      features: [
        t('pricing.plans.creator.features.0'),
        t('pricing.plans.creator.features.1'),
        t('pricing.plans.creator.features.2'),
        t('pricing.plans.creator.features.3'),
        t('pricing.plans.creator.features.4'),
        t('pricing.plans.creator.features.5'),
        t('pricing.plans.creator.features.6'),
        t('pricing.plans.creator.features.7')
      ]
    },
    {
      id: 'pro' as Plan,
      name: t('pricing.plans.pro.name'),
      monthlyPrice: 29,
      yearlyPrice: 23.2, // $278/yr (~20% off)
      description: t('pricing.plans.pro.desc'),
      popular: false,
      cta: currentUser?.plan === 'pro' ? t('pricing.currentPlanBadge') : t('pricing.plans.pro.cta'),
      features: [
        t('pricing.plans.pro.features.0'),
        t('pricing.plans.pro.features.1'),
        t('pricing.plans.pro.features.2'),
        t('pricing.plans.pro.features.3'),
        t('pricing.plans.pro.features.4'),
        t('pricing.plans.pro.features.5'),
        t('pricing.plans.pro.features.6')
      ]
    }
  ];

  return (
    <section id="pricing" className="py-24 bg-[#08090d] border-t border-white/5 relative">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-2xl mx-auto mb-12">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-purple-500/10 text-purple-400 text-xs font-semibold uppercase tracking-wider mb-4 border border-purple-500/20">
            <Sparkles className="w-3.5 h-3.5" />
            {t('pricing.badge')}
          </div>
          <h2 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight">
            {t('pricing.title')}
          </h2>
          <p className="mt-4 text-slate-400 text-base">
            {t('pricing.subtitle')}
          </p>

          {/* Billing Cycle Toggle */}
          <div className="mt-8 inline-flex items-center p-1 rounded-xl bg-slate-900 border border-white/10">
            <button
              onClick={() => setCycle('monthly')}
              className={`px-4 py-2 rounded-lg text-xs font-semibold transition-all ${
                cycle === 'monthly'
                  ? 'bg-purple-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              {t('pricing.monthly')}
            </button>
            <button
              onClick={() => setCycle('yearly')}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-semibold transition-all ${
                cycle === 'yearly'
                  ? 'bg-purple-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <span>{t('pricing.yearly')}</span>
              <span className="text-[10px] font-bold text-emerald-300 bg-emerald-950/60 px-1.5 py-0.5 rounded border border-emerald-500/30">
                {t('pricing.saveDiscount')}
              </span>
            </button>
          </div>
        </div>

        {/* Pricing Cards */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-stretch">
          {plans.map((p) => {
            const price = cycle === 'monthly' ? p.monthlyPrice : Math.round(p.yearlyPrice);
            const isCurrent = currentUser?.plan === p.id;

            return (
              <div
                key={p.id}
                className={`relative rounded-2xl p-8 flex flex-col justify-between transition-all duration-300 shadow-2xl ${
                  p.popular
                    ? 'bg-gradient-to-b from-purple-950/40 via-slate-900/90 to-slate-900/90 border-2 border-purple-500/60 ring-1 ring-purple-500/30 -translate-y-2'
                    : 'bg-slate-900/40 border border-white/10 hover:border-white/20'
                }`}
              >
                {p.badge && (
                  <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full bg-gradient-to-r from-purple-600 to-indigo-600 text-white font-mono text-[10px] font-extrabold tracking-widest uppercase shadow-lg shadow-purple-600/30">
                    {p.badge}
                  </div>
                )}

                <div>
                  <div className="flex items-center justify-between">
                    <h3 className="text-xl font-extrabold tracking-wider text-white font-mono">
                      {p.name}
                    </h3>
                    {isCurrent && (
                      <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded bg-purple-500/20 text-purple-300 border border-purple-500/30">
                        {t('pricing.currentPlanBadge')}
                      </span>
                    )}
                  </div>

                  <p className="mt-2 text-xs text-slate-400 leading-relaxed min-h-[36px]">
                    {p.description}
                  </p>

                  <div className="mt-6 flex items-baseline gap-1.5">
                    <span className="text-4xl font-extrabold text-white">${price}</span>
                    <span className="text-sm font-medium text-slate-400">{t('pricing.perMonth')}</span>
                  </div>
                  {cycle === 'yearly' && p.yearlyPrice > 0 && (
                    <p className="text-[11px] text-emerald-400 mt-1 font-mono">
                      {t('pricing.billedAnnually')} (${p.id === 'creator' ? 115 : 278}{t('pricing.perYear')})
                    </p>
                  )}

                  <div className="my-8 border-t border-white/10" />

                  <ul className="space-y-3.5">
                    {p.features.map((feat, i) => (
                      <li key={i} className="flex items-start gap-3 text-xs text-slate-300">
                        <Check className="w-4 h-4 text-purple-400 shrink-0 mt-0.5" />
                        <span>{feat}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="mt-8 pt-6 border-t border-white/5">
                  <button
                    id={`select-plan-${p.id}`}
                    onClick={() => onSelectPlan(p.id, cycle)}
                    disabled={isCurrent}
                    className={`w-full py-3.5 px-4 rounded-xl font-semibold text-sm transition-all duration-200 flex items-center justify-center gap-2 ${
                      isCurrent
                        ? 'bg-white/10 text-slate-400 cursor-default'
                        : p.popular
                        ? 'bg-purple-600 hover:bg-purple-500 text-white shadow-lg shadow-purple-600/30 hover:scale-[1.02] active:scale-[0.98]'
                        : 'bg-white/5 hover:bg-white/10 text-white border border-white/10 hover:border-white/25'
                    }`}
                  >
                    <span>{p.cta}</span>
                    {!isCurrent && <ArrowRight className="w-4 h-4" />}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
};
