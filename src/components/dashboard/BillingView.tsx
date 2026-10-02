import React, { useState } from 'react';
import {
  CreditCard,
  Sparkles,
  CheckCircle2,
  Calendar,
  Download,
  AlertTriangle,
  ArrowRight,
  ShieldCheck
} from 'lucide-react';
import { Plan, User } from '../../types';
import { useTranslation } from '../../i18n';

interface BillingViewProps {
  user: User;
  onUpgradePlan: (newPlan: Plan, cycle: 'monthly' | 'yearly') => void;
  onShowToast: (message: string, type?: 'success' | 'info' | 'warning') => void;
}

export const BillingView: React.FC<BillingViewProps> = ({
  user,
  onUpgradePlan,
  onShowToast
}) => {
  const { t } = useTranslation();
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [cycle, setCycle] = useState<'monthly' | 'yearly'>('monthly');

  const invoices = [
    {
      id: 'INV-2026-009',
      date: 'Sep 01, 2026',
      amount: user.plan === 'pro' ? '$29.00' : user.plan === 'creator' ? '$12.00' : '$0.00',
      status: t('common.completed'),
      planName: t('common.planLabel', { plan: user.plan.toUpperCase() })
    },
    {
      id: 'INV-2026-008',
      date: 'Aug 01, 2026',
      amount: user.plan === 'pro' ? '$29.00' : user.plan === 'creator' ? '$12.00' : '$0.00',
      status: t('common.completed'),
      planName: t('common.planLabel', { plan: user.plan.toUpperCase() })
    }
  ];

  const handleDownloadInvoice = (invId: string) => {
    onShowToast(`${t('billing.downloadInvoice')} ${invId}...`, 'info');
  };

  const handleConfirmCancel = () => {
    setShowCancelModal(false);
    onUpgradePlan('free', 'monthly');
    onShowToast(t('billing.cancelConfirmDesc'), 'info');
  };

  return (
    <div className="p-4 sm:p-8 max-w-5xl mx-auto space-y-10 animate-in fade-in duration-200">
      {/* Header */}
      <div className="border-b border-white/10 pb-5">
        <h1 className="text-2xl font-bold text-white tracking-tight font-sans">
          {t('billing.title')}
        </h1>
        <p className="text-xs text-slate-400 mt-1">
          {t('billing.subtitle')}
        </p>
      </div>

      {/* Current Plan Card */}
      <div className="p-6 sm:p-8 rounded-3xl bg-gradient-to-r from-purple-950/40 via-slate-900 to-slate-900 border border-purple-500/30 shadow-2xl relative overflow-hidden flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="space-y-3 max-w-md">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-purple-500/20 text-purple-300 text-xs font-mono border border-purple-500/30">
            <Sparkles className="w-3.5 h-3.5" />
            <span className="capitalize">{t('billing.activeTier')}</span>
          </div>

          <h2 className="text-3xl font-extrabold text-white tracking-tight font-mono">
            {t('billing.tierTitle', { plan: user.plan.toUpperCase() })}
          </h2>

          <p className="text-xs text-slate-300 leading-relaxed">
            {user.plan === 'free'
              ? t('billing.tierDescFree')
              : t('billing.tierDescPaid')}
          </p>

          <div className="flex items-center gap-4 text-xs font-mono text-slate-400 pt-1">
            <span className="flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 text-purple-400" />
              {t('billing.renewsDate', { date: 'Oct 04, 2026' })}
            </span>
            <span>•</span>
            <span className="text-emerald-400 font-semibold">{t('common.statusActive')}</span>
          </div>
        </div>

        {/* AI Generations Usage Meter */}
        <div className="p-5 rounded-2xl bg-slate-950/80 border border-white/10 w-full md:w-72 shrink-0 space-y-3">
          <div className="flex items-center justify-between text-xs">
            <span className="text-slate-400 font-medium">{t('billing.generationsUsed')}</span>
            <span className="font-mono text-purple-400 font-bold">
              {user.aiGenerationsUsed} {t('billing.ofLimit')} {user.aiGenerationsLimit}
            </span>
          </div>

          <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-purple-500 to-indigo-500 rounded-full transition-all duration-500"
              style={{
                width: `${Math.min(100, (user.aiGenerationsUsed / user.aiGenerationsLimit) * 100)}%`
              }}
            />
          </div>

          <p className="text-[10px] text-slate-500 font-mono">
            {t('billing.resetsNotice')}
          </p>
        </div>
      </div>

      {/* Plan Upgrade Tiers */}
      <div className="space-y-4">
        <h3 className="text-sm font-mono uppercase tracking-wider text-slate-400 font-bold">
          {t('pricing.title')}
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* FREE */}
          <div className="p-6 rounded-2xl bg-slate-900/40 border border-white/10 flex flex-col justify-between">
            <div>
              <h4 className="text-base font-bold text-white font-mono">{t('pricing.plans.free.name')}</h4>
              <p className="text-2xl font-extrabold text-white mt-2">$0</p>
              <p className="text-xs text-slate-400 mt-1">{t('pricing.plans.free.desc')}</p>
            </div>
            <button
              onClick={() => onUpgradePlan('free', 'monthly')}
              disabled={user.plan === 'free'}
              className="mt-6 w-full py-2.5 rounded-xl border border-white/10 text-xs font-semibold disabled:opacity-40"
            >
              {user.plan === 'free' ? t('pricing.plans.free.currentCta') : t('pricing.plans.free.cta')}
            </button>
          </div>

          {/* CREATOR */}
          <div className="p-6 rounded-2xl bg-gradient-to-b from-purple-950/30 to-slate-900/60 border-2 border-purple-500/50 flex flex-col justify-between shadow-xl">
            <div>
              <div className="flex items-center justify-between">
                <h4 className="text-base font-bold text-white font-mono">{t('pricing.plans.creator.name')}</h4>
                <span className="text-[9px] uppercase font-mono px-2 py-0.5 rounded bg-purple-500/20 text-purple-300 font-bold">
                  {t('pricing.plans.creator.popular')}
                </span>
              </div>
              <p className="text-2xl font-extrabold text-white mt-2">
                $12 <span className="text-xs font-normal text-slate-400">{t('pricing.perMonth')}</span>
              </p>
              <p className="text-xs text-slate-300 mt-1">
                {t('pricing.plans.creator.desc')}
              </p>
            </div>
            <button
              onClick={() => onUpgradePlan('creator', 'monthly')}
              disabled={user.plan === 'creator'}
              className="mt-6 w-full py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-semibold shadow-md shadow-purple-600/30 transition disabled:opacity-40"
            >
              {user.plan === 'creator' ? t('pricing.plans.creator.currentCta') : t('pricing.plans.creator.cta')}
            </button>
          </div>

          {/* PRO */}
          <div className="p-6 rounded-2xl bg-slate-900/40 border border-white/10 flex flex-col justify-between">
            <div>
              <h4 className="text-base font-bold text-white font-mono">{t('pricing.plans.pro.name')}</h4>
              <p className="text-2xl font-extrabold text-white mt-2">
                $29 <span className="text-xs font-normal text-slate-400">{t('pricing.perMonth')}</span>
              </p>
              <p className="text-xs text-slate-400 mt-1">
                {t('pricing.plans.pro.desc')}
              </p>
            </div>
            <button
              onClick={() => onUpgradePlan('pro', 'monthly')}
              disabled={user.plan === 'pro'}
              className="mt-6 w-full py-2.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-white text-xs font-semibold transition disabled:opacity-40"
            >
              {user.plan === 'pro' ? t('pricing.plans.pro.currentCta') : t('pricing.plans.pro.cta')}
            </button>
          </div>
        </div>
      </div>

      {/* Invoice History Table */}
      <div className="p-6 rounded-2xl bg-slate-900/40 border border-white/10 space-y-4">
        <h3 className="text-xs font-mono uppercase tracking-wider text-slate-400 font-bold">
          {t('billing.invoicesTitle')}
        </h3>

        <div className="divide-y divide-white/5 text-xs">
          {invoices.map((inv) => (
            <div key={inv.id} className="py-3 flex items-center justify-between">
              <div className="flex items-center gap-4">
                <span className="font-mono text-purple-400 font-semibold">{inv.id}</span>
                <span className="text-slate-400">{inv.date}</span>
                <span className="text-slate-300 font-medium hidden sm:inline">{inv.planName}</span>
              </div>
              <div className="flex items-center gap-4">
                <span className="font-mono text-white font-bold">{inv.amount}</span>
                <span className="text-emerald-400 text-[10px] font-mono uppercase px-2 py-0.5 rounded bg-emerald-500/10 border border-emerald-500/20">
                  {inv.status}
                </span>
                <button
                  onClick={() => handleDownloadInvoice(inv.id)}
                  className="p-1 text-slate-400 hover:text-white transition"
                  title={t('billing.downloadInvoice')}
                >
                  <Download className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Cancel Subscription link if on paid plan */}
      {user.plan !== 'free' && (
        <div className="pt-2 text-right">
          <button
            onClick={() => setShowCancelModal(true)}
            className="text-xs text-rose-400/80 hover:text-rose-300 underline font-medium transition"
          >
            {t('billing.cancelSubscription')}
          </button>
        </div>
      )}

      {/* Cancel Subscription Warning Modal */}
      {showCancelModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xs">
          <div className="max-w-md w-full p-6 rounded-2xl bg-slate-900 border border-white/15 space-y-4">
            <div className="flex items-center gap-3 text-amber-400">
              <AlertTriangle className="w-6 h-6" />
              <h3 className="text-base font-bold text-white">{t('billing.cancelConfirmTitle')}</h3>
            </div>
            <p className="text-xs text-slate-300 leading-relaxed">
              {t('billing.cancelConfirmDesc')}
            </p>
            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                onClick={() => setShowCancelModal(false)}
                className="px-4 py-2 rounded-xl text-xs text-slate-400 hover:text-white"
              >
                {t('billing.keepPlan')}
              </button>
              <button
                onClick={handleConfirmCancel}
                className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-semibold text-xs"
              >
                {t('billing.confirmCancel')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
