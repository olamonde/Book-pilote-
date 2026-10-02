import React, { useState } from 'react';
import { Compass, ArrowRight, Check, Sparkles, Zap, Crown, Shield } from 'lucide-react';
import { Plan } from '../../types';
import { useTranslation } from '../../i18n';

interface OnboardingModalProps {
  isOpen: boolean;
  onComplete: (plan: Plan) => void;
  savedPrompt?: string;
}

export const OnboardingModal: React.FC<OnboardingModalProps> = ({
  isOpen,
  onComplete,
  savedPrompt
}) => {
  const { t } = useTranslation();
  const [selectedPlan, setSelectedPlan] = useState<Plan>('free');

  if (!isOpen) return null;

  const plans = [
    {
      id: 'free' as Plan,
      name: t('pricing.plans.free.name'),
      badge: t('common.draft'),
      price: '$0',
      period: t('pricing.perMonth'),
      description: t('pricing.plans.free.desc'),
      features: [
        t('pricing.plans.free.features.0'),
        t('pricing.plans.free.features.1'),
        t('pricing.plans.free.features.2'),
        t('pricing.plans.free.features.3'),
        t('pricing.plans.free.features.4')
      ],
      cta: t('pricing.plans.free.cta'),
      popular: false,
      icon: Zap
    },
    {
      id: 'creator' as Plan,
      name: t('pricing.plans.creator.name'),
      badge: t('pricing.plans.creator.popular'),
      price: '$12',
      period: t('pricing.perMonth'),
      description: t('pricing.plans.creator.desc'),
      features: [
        t('pricing.plans.creator.features.0'),
        t('pricing.plans.creator.features.1'),
        t('pricing.plans.creator.features.2'),
        t('pricing.plans.creator.features.3'),
        t('pricing.plans.creator.features.4'),
        t('pricing.plans.creator.features.5')
      ],
      cta: t('pricing.plans.creator.cta'),
      popular: true,
      icon: Sparkles
    },
    {
      id: 'pro' as Plan,
      name: t('pricing.plans.pro.name'),
      badge: 'PRO',
      price: '$29',
      period: t('pricing.perMonth'),
      description: t('pricing.plans.pro.desc'),
      features: [
        t('pricing.plans.pro.features.0'),
        t('pricing.plans.pro.features.1'),
        t('pricing.plans.pro.features.2'),
        t('pricing.plans.pro.features.3'),
        t('pricing.plans.pro.features.4'),
        t('pricing.plans.pro.features.5')
      ],
      cta: t('pricing.plans.pro.cta'),
      popular: false,
      icon: Crown
    }
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-4xl rounded-3xl bg-[#080808] border border-white/10 shadow-[0_0_60px_rgba(0,0,0,0.8)] p-6 sm:p-8 overflow-hidden max-h-[92vh] overflow-y-auto">
        {/* Glow accent */}
        <div className="absolute top-0 right-1/4 w-96 h-48 bg-gradient-to-r from-purple-600/20 to-blue-600/20 blur-3xl pointer-events-none" />

        {/* Welcome Header */}
        <div className="text-center max-w-2xl mx-auto mb-8">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-gradient-to-br from-purple-600 to-indigo-600 text-white mb-3 shadow-[0_0_25px_rgba(124,58,237,0.4)]">
            <Compass className="w-6 h-6" />
          </div>
          <h2 className="text-2xl sm:text-3xl font-bold text-white tracking-tight font-sans">
            {t('auth.welcome')}
          </h2>
          <p className="mt-2 text-sm text-[#9CA3AF]">
            {savedPrompt
              ? t('auth.promptContextTitle')
              : t('pricing.subtitle')}
          </p>
        </div>

        {/* Plan Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          {plans.map((p) => {
            const isSelected = selectedPlan === p.id;
            const Icon = p.icon;

            return (
              <div
                key={p.id}
                onClick={() => setSelectedPlan(p.id)}
                className={`relative rounded-2xl p-5 border transition-all cursor-pointer flex flex-col justify-between select-none ${
                  isSelected
                    ? 'bg-[#121216] border-[#7C3AED] shadow-[0_0_30px_rgba(124,58,237,0.25)] ring-1 ring-[#7C3AED]'
                    : 'bg-[#0E0E10] border-white/10 hover:border-white/20 hover:bg-[#121214]'
                }`}
              >
                {/* Popular Pill */}
                {p.popular && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-0.5 rounded-full bg-gradient-to-r from-[#7C3AED] to-[#3B82F6] text-white text-[10px] font-bold uppercase tracking-wider shadow-md">
                    {p.badge}
                  </div>
                )}

                <div>
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <div className={`p-1.5 rounded-lg ${isSelected ? 'bg-purple-600/20 text-[#7C3AED]' : 'bg-white/5 text-slate-400'}`}>
                        <Icon className="w-4 h-4" />
                      </div>
                      <h3 className="text-base font-bold text-white font-sans">{p.name}</h3>
                    </div>
                    <div
                      className={`w-5 h-5 rounded-full border flex items-center justify-center transition-all ${
                        isSelected
                          ? 'border-[#7C3AED] bg-[#7C3AED] text-white'
                          : 'border-white/20 bg-white/5'
                      }`}
                    >
                      {isSelected && <Check className="w-3 h-3" />}
                    </div>
                  </div>

                  <div className="mb-3">
                    <span className="text-2xl font-bold text-white font-sans">{p.price}</span>
                    <span className="text-xs text-[#9CA3AF] ml-1.5 font-mono">{p.period}</span>
                  </div>

                  <p className="text-xs text-[#9CA3AF] leading-relaxed mb-4 min-h-[36px]">
                    {p.description}
                  </p>

                  <div className="space-y-2 pt-3 border-t border-white/5">
                    {p.features.map((feat, idx) => (
                      <div key={idx} className="flex items-start gap-2 text-xs text-[#D1D5DB]">
                        <Check className="w-3.5 h-3.5 text-[#7C3AED] shrink-0 mt-0.5" />
                        <span className="leading-tight">{feat}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="mt-5 pt-3">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedPlan(p.id);
                      onComplete(p.id);
                    }}
                    className={`w-full py-2.5 px-3 rounded-xl text-xs font-semibold transition ${
                      isSelected
                        ? 'bg-gradient-to-r from-[#7C3AED] to-[#3B82F6] text-white shadow-lg shadow-purple-600/25'
                        : 'bg-white/5 hover:bg-white/10 text-white border border-white/10'
                    }`}
                  >
                    {p.cta}
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        {/* Bottom Confirmation Bar */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-4 border-t border-white/10">
          <div className="text-xs text-[#9CA3AF] flex items-center gap-2">
            <Shield className="w-4 h-4 text-emerald-400" />
            <span>{t('auth.demoNotice')}</span>
          </div>

          <div className="flex items-center gap-3 w-full sm:w-auto">
            {selectedPlan !== 'free' && (
              <button
                type="button"
                onClick={() => onComplete('free')}
                className="text-xs text-[#9CA3AF] hover:text-white underline transition px-2 py-1"
              >
                {t('pricing.plans.free.cta')}
              </button>
            )}
            <button
              id="onboarding-confirm-plan-btn"
              type="button"
              onClick={() => onComplete(selectedPlan)}
              className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-gradient-to-r from-[#7C3AED] to-[#3B82F6] hover:opacity-95 text-white font-semibold text-xs transition shadow-[0_0_20px_rgba(124,58,237,0.3)]"
            >
              <span>
                {selectedPlan === 'free'
                  ? t('pricing.plans.free.cta')
                  : `${t('common.save')} (${selectedPlan.toUpperCase()})`}
              </span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
