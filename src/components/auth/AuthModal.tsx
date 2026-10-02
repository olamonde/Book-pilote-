import React, { useState, useEffect } from 'react';
import { Compass, X, Mail, Lock, User as UserIcon, ArrowRight, CheckCircle2, ShieldCheck, Chrome, Sparkles } from 'lucide-react';
import { User } from '../../types';
import { StorageService } from '../../services/storageService';
import { useTranslation } from '../../i18n';

interface AuthModalProps {
  isOpen: boolean;
  initialMode?: 'login' | 'signup' | 'forgot';
  onClose: () => void;
  onSuccess: (user: User) => void;
  promptContext?: string;
}

export const AuthModal: React.FC<AuthModalProps> = ({
  isOpen,
  initialMode = 'login',
  onClose,
  onSuccess,
  promptContext
}) => {
  const { t } = useTranslation();
  const [mode, setMode] = useState<'login' | 'signup' | 'forgot' | 'reset-sent' | 'email-verify'>(
    initialMode
  );
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setMode(initialMode);
      setError(null);
    }
  }, [isOpen, initialMode]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    // Simulate authentication processing
    setTimeout(() => {
      setIsLoading(false);

      if (mode === 'forgot') {
        setMode('reset-sent');
        return;
      }

      if (!email || !password) {
        setError(t('auth.requiredFieldsError'));
        return;
      }

      // Successful auth with stable user profile
      const authenticatedUser = StorageService.findOrCreateUser(email, name);
      onSuccess(authenticatedUser);
      onClose();
    }, 600);
  };

  const handleGoogleSignIn = () => {
    setIsLoading(true);
    setTimeout(() => {
      setIsLoading(false);
      const googleUser = StorageService.findOrCreateUser('alex.rivera@gmail.com', 'Alex Rivera');
      onSuccess(googleUser);
      onClose();
    }, 500);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-md rounded-2xl bg-slate-900 border border-white/10 shadow-2xl p-6 sm:p-8 overflow-hidden max-h-[90vh] overflow-y-auto">
        {/* Ambient Top Glow */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-48 h-24 bg-purple-600/20 blur-2xl pointer-events-none" />

        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-5 right-5 p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-white/5 transition"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Brand Header */}
        <div className="text-center mb-5">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-purple-600/10 border border-purple-500/20 text-purple-400 mb-3">
            <Compass className="w-6 h-6" />
          </div>
          <h3 className="text-xl font-bold text-white tracking-tight font-sans">
            {promptContext ? t('auth.promptContextTitle') : (
              <>
                {mode === 'login' && t('auth.loginTitle')}
                {mode === 'signup' && t('auth.signupTitle')}
                {mode === 'forgot' && t('auth.forgotTitle')}
                {mode === 'reset-sent' && t('auth.checkEmail')}
              </>
            )}
          </h3>
          <p className="mt-1 text-xs text-slate-400">
            {promptContext ? (
              t('hero.engineNotice')
            ) : (
              <>
                {mode === 'login' && t('auth.loginSubtitle')}
                {mode === 'signup' && t('auth.signupSubtitle')}
                {mode === 'forgot' && t('auth.forgotSubtitle')}
              </>
            )}
          </p>
        </div>

        {/* Saved Prompt Banner if user came from Hero */}
        {promptContext && (
          <div className="mb-5 p-3.5 rounded-xl bg-purple-950/40 border border-purple-500/30 text-left">
            <div className="flex items-center gap-1.5 text-xs font-semibold text-purple-300 mb-1">
              <Sparkles className="w-3.5 h-3.5 text-purple-400 shrink-0" />
              <span>{t('auth.savedIdea')}</span>
            </div>
            <p className="text-xs text-slate-200 italic line-clamp-2 pl-5">
              « {promptContext} »
            </p>
            <div className="mt-2 pt-2 border-t border-purple-500/20 flex items-center gap-1.5 text-[11px] text-emerald-400 font-medium">
              <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
              <span>{t('auth.autoResumeNotice')}</span>
            </div>
          </div>
        )}

        {/* Tab switchers: Créer un compte / Se connecter */}
        {(mode === 'login' || mode === 'signup') && (
          <div className="flex rounded-xl bg-slate-950/80 p-1 border border-white/10 mb-5">
            <button
              type="button"
              onClick={() => setMode('signup')}
              className={`flex-1 py-2 text-xs font-semibold rounded-lg transition-all ${
                mode === 'signup'
                  ? 'bg-purple-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              {t('auth.createAccount')}
            </button>
            <button
              type="button"
              onClick={() => setMode('login')}
              className={`flex-1 py-2 text-xs font-semibold rounded-lg transition-all ${
                mode === 'login'
                  ? 'bg-purple-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              {t('auth.loginBtn')}
            </button>
          </div>
        )}

        {error && (
          <div className="mb-4 p-3 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs flex items-center gap-2">
            <span>{error}</span>
          </div>
        )}

        {/* Reset Confirmation View */}
        {mode === 'reset-sent' ? (
          <div className="text-center py-4 space-y-4">
            <div className="w-12 h-12 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center mx-auto">
              <CheckCircle2 className="w-6 h-6" />
            </div>
            <p className="text-xs text-slate-300">
              {t('auth.resetSentMessage')}
            </p>
            <button
              onClick={() => setMode('login')}
              className="w-full py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-medium text-xs transition"
            >
              {t('auth.backToLogin')}
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            {mode === 'signup' && (
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1.5">{t('auth.nameLabel')}</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-500">
                    <UserIcon className="w-4 h-4" />
                  </div>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder={t('auth.namePlaceholder')}
                    className="w-full pl-9 pr-3 py-2.5 bg-slate-950 border border-white/10 rounded-xl text-white placeholder-slate-500 text-xs focus:ring-1 focus:ring-purple-500 focus:outline-hidden"
                  />
                </div>
              </div>
            )}

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1.5">{t('auth.emailLabel')}</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-500">
                  <Mail className="w-4 h-4" />
                </div>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder={t('auth.emailPlaceholder')}
                  className="w-full pl-9 pr-3 py-2.5 bg-slate-950 border border-white/10 rounded-xl text-white placeholder-slate-500 text-xs focus:ring-1 focus:ring-purple-500 focus:outline-hidden"
                />
              </div>
            </div>

            {mode !== 'forgot' && (
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-medium text-slate-300">{t('auth.passwordLabel')}</label>
                  {mode === 'login' && (
                    <button
                      type="button"
                      onClick={() => setMode('forgot')}
                      className="text-[11px] text-purple-400 hover:text-purple-300 transition"
                    >
                      {t('auth.forgotPasswordLink')}
                    </button>
                  )}
                </div>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-500">
                    <Lock className="w-4 h-4" />
                  </div>
                  <input
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••••••"
                    className="w-full pl-9 pr-3 py-2.5 bg-slate-950 border border-white/10 rounded-xl text-white placeholder-slate-500 text-xs focus:ring-1 focus:ring-purple-500 focus:outline-hidden"
                  />
                </div>
              </div>
            )}

            <button
              id="auth-submit-btn"
              type="submit"
              disabled={isLoading}
              className="w-full py-3 px-4 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-semibold text-xs transition shadow-lg shadow-purple-600/30 flex items-center justify-center gap-2 mt-2 disabled:opacity-50"
            >
              {isLoading ? (
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <>
                  <span>
                    {mode === 'login' && t('auth.loginBtn')}
                    {mode === 'signup' && t('auth.signupBtn')}
                    {mode === 'forgot' && t('auth.resetBtn')}
                  </span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </>
              )}
            </button>

            {mode !== 'forgot' && (
              <>
                <div className="relative my-4">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-white/10" />
                  </div>
                  <div className="relative flex justify-center text-[10px] uppercase font-mono">
                    <span className="bg-slate-900 px-3 text-slate-500">{t('auth.orSeparator')}</span>
                  </div>
                </div>

                <button
                  id="google-signin-btn"
                  type="button"
                  onClick={handleGoogleSignIn}
                  disabled={isLoading}
                  className="w-full py-2.5 px-4 rounded-xl bg-white/5 hover:bg-white/10 text-white font-medium text-xs border border-white/10 transition flex items-center justify-center gap-2.5"
                >
                  <svg className="w-4 h-4" viewBox="0 0 24 24">
                    <path
                      fill="#EA4335"
                      d="M12 5c1.6 0 3 .6 4.1 1.7l3.1-3.1C17.3 1.8 14.8 1 12 1 7.4 1 3.5 3.6 1.6 7.3l3.7 2.9C6.2 7.3 8.9 5 12 5z"
                    />
                    <path
                      fill="#4285F4"
                      d="M23.5 12.3c0-.8-.1-1.6-.2-2.3H12v4.6h6.5c-.3 1.5-1.1 2.8-2.4 3.7l3.7 2.9c2.2-2 3.7-5 3.7-8.9z"
                    />
                    <path
                      fill="#FBBC05"
                      d="M5.3 14.8c-.2-.7-.4-1.5-.4-2.3s.2-1.6.4-2.3L1.6 7.3C.6 9.3 0 11.1 0 12.5s.6 3.2 1.6 5.2l3.7-2.9z"
                    />
                    <path
                      fill="#34A853"
                      d="M12 24c3.2 0 6-1.1 8-3l-3.7-2.9c-1.1.7-2.5 1.2-4.3 1.2-3.1 0-5.8-2.3-6.7-5.2L1.6 17c1.9 3.7 5.8 7 10.4 7z"
                    />
                  </svg>
                  <span>{t('auth.googleSignIn')}</span>
                </button>
              </>
            )}

            <div className="pt-2 text-center text-xs text-slate-400">
              {mode === 'login' ? (
                <p>
                  {t('auth.noAccount')}{' '}
                  <button
                    type="button"
                    onClick={() => setMode('signup')}
                    className="text-purple-400 hover:text-purple-300 font-semibold"
                  >
                    {t('auth.signupPrompt')}
                  </button>
                </p>
              ) : (
                <p>
                  {t('auth.haveAccount')}{' '}
                  <button
                    type="button"
                    onClick={() => setMode('login')}
                    className="text-purple-400 hover:text-purple-300 font-semibold"
                  >
                    {t('auth.loginPrompt')}
                  </button>
                </p>
              )}
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
