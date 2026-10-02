import React, { useState } from 'react';
import {
  User as UserIcon,
  Globe2,
  Lock,
  Save,
  Cpu,
  CheckCircle2,
  AlertTriangle,
  BookOpen
} from 'lucide-react';
import { User } from '../../types';
import { useTranslation, useLanguage } from '../../i18n';
import { LanguageSelector } from '../common/LanguageSelector';

interface SettingsViewProps {
  user: User;
  onUpdateUser: (updatedUser: User) => void;
  onShowToast: (message: string, type?: 'success' | 'info' | 'warning') => void;
}

export const SettingsView: React.FC<SettingsViewProps> = ({
  user,
  onUpdateUser,
  onShowToast
}) => {
  const { t } = useTranslation();
  const { contentLanguage, setContentLanguage, availableContentLanguages } = useLanguage();

  const [name, setName] = useState(user.name);
  const [email, setEmail] = useState(user.email);
  const [defaultTone, setDefaultTone] = useState('Professional');
  const [aiWritingMode, setAiWritingMode] = useState('literary');

  // Password fields
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');

  // Delete modal state
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const handleSaveProfile = (e: React.FormEvent) => {
    e.preventDefault();
    onUpdateUser({
      ...user,
      name,
      email,
      defaultContentLanguage: contentLanguage
    });
    onShowToast(t('common.saved'), 'success');
  };

  const handleSavePassword = (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentPassword || !newPassword) {
      onShowToast(t('common.error'), 'warning');
      return;
    }
    setCurrentPassword('');
    setNewPassword('');
    onShowToast(t('common.saved'), 'success');
  };

  return (
    <div className="p-4 sm:p-8 max-w-4xl mx-auto space-y-8 animate-in fade-in duration-200">
      {/* Header */}
      <div className="border-b border-white/10 pb-5">
        <h1 className="text-2xl font-bold text-white tracking-tight font-sans">
          {t('settings.title')}
        </h1>
        <p className="text-xs text-slate-400 mt-1">
          {t('settings.subtitle')}
        </p>
      </div>

      {/* 1. Interface Language Selector (Independent of content) */}
      <div className="p-6 rounded-2xl bg-slate-900/40 border border-white/10 space-y-4">
        <div className="flex items-center gap-3 pb-3 border-b border-white/5">
          <div className="w-8 h-8 rounded-lg bg-purple-500/10 border border-purple-500/20 text-purple-400 flex items-center justify-center">
            <Globe2 className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-white">
              {t('settings.interfaceLanguage.title')}
            </h3>
            <p className="text-[11px] text-slate-400">
              {t('settings.interfaceLanguage.desc')}
            </p>
          </div>
        </div>

        <LanguageSelector variant="full" />
      </div>

      {/* 2. Profile & Book Defaults */}
      <form
        onSubmit={handleSaveProfile}
        className="p-6 rounded-2xl bg-slate-900/40 border border-white/10 space-y-6"
      >
        <div className="flex items-center gap-3 pb-3 border-b border-white/5">
          <div className="w-8 h-8 rounded-lg bg-purple-500/10 border border-purple-500/20 text-purple-400 flex items-center justify-center">
            <UserIcon className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-white">
              {t('settings.authorProfile.title')}
            </h3>
            <p className="text-[11px] text-slate-400">
              {t('settings.authorProfile.desc')}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1.5">
              {t('settings.authorProfile.name')}
            </label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full bg-slate-950 border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-hidden focus:border-purple-500"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1.5">
              {t('settings.authorProfile.email')}
            </label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full bg-slate-950 border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-hidden focus:border-purple-500"
            />
          </div>
        </div>

        {/* Content Language setting */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1.5 flex items-center gap-1.5">
              <BookOpen className="w-3.5 h-3.5 text-purple-400" />
              <span>{t('settings.authorProfile.defaultBookLang')}</span>
            </label>
            <select
              value={contentLanguage}
              onChange={(e) => setContentLanguage(e.target.value)}
              className="w-full bg-slate-950 border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-hidden focus:border-purple-500"
            >
              {availableContentLanguages.map((lang) => (
                <option key={lang.code} value={lang.name}>
                  {lang.flag} {lang.name} ({lang.nativeName})
                </option>
              ))}
            </select>
            <p className="text-[10px] text-slate-400 mt-1">
              {t('settings.authorProfile.defaultBookLangHelp')}
            </p>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1.5">
              {t('settings.authorProfile.defaultTone')}
            </label>
            <select
              value={defaultTone}
              onChange={(e) => setDefaultTone(e.target.value)}
              className="w-full bg-slate-950 border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-hidden focus:border-purple-500"
            >
              {[
                { value: 'Professional', label: t('settings.authorProfile.tones.professional') },
                { value: 'Friendly', label: t('settings.authorProfile.tones.friendly') },
                { value: 'Inspirational', label: t('settings.authorProfile.tones.inspirational') },
                { value: 'Academic', label: t('settings.authorProfile.tones.academic') },
                { value: 'Casual', label: t('settings.authorProfile.tones.casual') },
                { value: 'Storytelling', label: t('settings.authorProfile.tones.storytelling') }
              ].map((tn) => (
                <option key={tn.value} value={tn.value}>
                  {tn.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="flex justify-end pt-2">
          <button
            type="submit"
            className="px-5 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-semibold text-xs transition flex items-center gap-1.5 shadow-md"
          >
            <Save className="w-3.5 h-3.5" />
            <span>{t('settings.authorProfile.saveBtn')}</span>
          </button>
        </div>
      </form>

      {/* 3. Book Pilot AI & Writing Assistant */}
      <div className="p-6 rounded-2xl bg-slate-900/40 border border-white/10 space-y-6">
        <div className="flex items-center gap-3 pb-3 border-b border-white/5">
          <div className="w-8 h-8 rounded-lg bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 flex items-center justify-center">
            <Cpu className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-white">
              {t('settings.aiPreferences.title')}
            </h3>
            <p className="text-[11px] text-slate-400">
              {t('settings.aiPreferences.desc')}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1.5">
              {t('settings.aiPreferences.styleLabel')}
            </label>
            <select
              value={aiWritingMode}
              onChange={(e) => {
                setAiWritingMode(e.target.value);
                onShowToast(t('common.saved'), 'success');
              }}
              className="w-full bg-slate-950 border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-hidden focus:border-purple-500"
            >
              <option value="literary">{t('settings.aiPreferences.modes.literary')}</option>
              <option value="concise">{t('settings.aiPreferences.modes.concise')}</option>
              <option value="analytical">{t('settings.aiPreferences.modes.analytical')}</option>
              <option value="creative">{t('settings.aiPreferences.modes.creative')}</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1.5">
              {t('settings.aiPreferences.statusLabel')}
            </label>
            <div className="flex items-center gap-2 bg-slate-950 border border-white/10 rounded-xl px-3 py-2 text-xs text-emerald-400">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              <span>{t('settings.aiPreferences.activeStatus')}</span>
            </div>
          </div>
        </div>
      </div>

      {/* 4. Security & Password */}
      <form
        onSubmit={handleSavePassword}
        className="p-6 rounded-2xl bg-slate-900/40 border border-white/10 space-y-6"
      >
        <div className="flex items-center gap-3 pb-3 border-b border-white/5">
          <div className="w-8 h-8 rounded-lg bg-sky-500/10 border border-sky-500/20 text-sky-400 flex items-center justify-center">
            <Lock className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-white">
              {t('settings.security.title')}
            </h3>
            <p className="text-[11px] text-slate-400">
              {t('settings.security.desc')}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1.5">
              {t('settings.security.currentPass')}
            </label>
            <input
              type="password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              placeholder="••••••••••••"
              className="w-full bg-slate-950 border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-hidden focus:border-purple-500"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1.5">
              {t('settings.security.newPass')}
            </label>
            <input
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="••••••••••••"
              className="w-full bg-slate-950 border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-hidden focus:border-purple-500"
            />
          </div>
        </div>

        <div className="flex justify-end pt-2">
          <button
            type="submit"
            className="px-5 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-white font-semibold text-xs border border-white/10 transition"
          >
            {t('settings.security.updateBtn')}
          </button>
        </div>
      </form>

      {/* 5. Danger Zone */}
      <div className="p-6 rounded-2xl bg-rose-950/20 border border-rose-500/20 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h4 className="text-sm font-bold text-rose-300">
              {t('settings.dangerZone.deleteAccount')}
            </h4>
            <p className="text-xs text-rose-400/80 mt-0.5">
              {t('settings.dangerZone.deleteWarning')}
            </p>
          </div>

          <button
            type="button"
            onClick={() => setShowDeleteConfirm(true)}
            className="px-4 py-2 rounded-xl bg-rose-600/20 hover:bg-rose-600 text-rose-200 hover:text-white border border-rose-500/30 text-xs font-semibold transition"
          >
            {t('common.delete')}
          </button>
        </div>
      </div>

      {/* Delete Confirmation Dialog */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xs">
          <div className="max-w-md w-full p-6 rounded-2xl bg-slate-900 border border-rose-500/30 space-y-4">
            <div className="flex items-center gap-3 text-rose-400">
              <AlertTriangle className="w-6 h-6" />
              <h3 className="text-base font-bold text-white">
                {t('settings.dangerZone.confirmTitle')}
              </h3>
            </div>
            <p className="text-xs text-slate-300 leading-relaxed">
              {t('settings.dangerZone.confirmDesc')}
            </p>
            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                onClick={() => setShowDeleteConfirm(false)}
                className="px-4 py-2 rounded-xl text-xs text-slate-400 hover:text-white"
              >
                {t('common.cancel')}
              </button>
              <button
                onClick={() => {
                  setShowDeleteConfirm(false);
                  localStorage.clear();
                  window.location.reload();
                }}
                className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-semibold text-xs"
              >
                {t('settings.dangerZone.confirmAction')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
