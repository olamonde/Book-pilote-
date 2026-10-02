import React from 'react';
import {
  Compass,
  Home,
  LayoutDashboard,
  BookOpen,
  FileEdit,
  CheckCircle2,
  PlusCircle,
  Palette,
  Layers,
  Settings,
  CreditCard,
  LogOut,
  X,
  Sparkles
} from 'lucide-react';
import { User, ViewRoute } from '../../types';
import { useTranslation } from '../../i18n';

interface SidebarProps {
  currentRoute: ViewRoute;
  onNavigate: (route: ViewRoute) => void;
  user: User;
  onLogout: () => void;
  isOpenMobile: boolean;
  onCloseMobile: () => void;
  bookFilter?: string;
  onSelectBookFilter?: (filter: 'all' | 'drafts' | 'completed') => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentRoute,
  onNavigate,
  user,
  onLogout,
  isOpenMobile,
  onCloseMobile,
  bookFilter = 'all',
  onSelectBookFilter
}) => {
  const { t } = useTranslation();

  const handleNav = (route: ViewRoute) => {
    onNavigate(route);
    onCloseMobile();
  };

  const handleBookFilter = (filter: 'all' | 'drafts' | 'completed') => {
    if (onSelectBookFilter) onSelectBookFilter(filter);
    onNavigate('books');
    onCloseMobile();
  };

  return (
    <>
      {/* Mobile backdrop */}
      {isOpenMobile && (
        <div
          className="fixed inset-0 z-40 bg-black/80 backdrop-blur-xs lg:hidden"
          onClick={onCloseMobile}
        />
      )}

      <aside
        className={`fixed top-0 bottom-0 left-0 z-40 w-64 bg-[#080808] border-r border-[#ffffff10] flex flex-col justify-between transition-transform duration-300 lg:translate-x-0 h-screen overflow-hidden ${
          isOpenMobile ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Top Branding */}
        <div className="flex flex-col min-h-0">
          <div className="h-20 px-6 flex items-center justify-between border-b border-[#ffffff08] shrink-0">
            <div
              onClick={() => handleNav('landing')}
              className="flex items-center gap-3 cursor-pointer select-none group"
              title={t('navbar.home')}
            >
              <div className="w-10 h-10 bg-gradient-to-br from-[#7C3AED] to-[#3B82F6] rounded-xl flex items-center justify-center shadow-[0_0_20px_rgba(124,58,237,0.3)] text-white group-hover:scale-105 transition">
                <Compass className="w-5 h-5" />
              </div>
              <div className="flex flex-col">
                <span className="text-lg font-bold tracking-tight text-white font-sans">
                  BOOK PILOT
                </span>
                <span className="text-[9px] uppercase tracking-wider text-[#7C3AED] font-mono">
                  {t('common.appTagline')}
                </span>
              </div>
            </div>
            <button
              onClick={onCloseMobile}
              className="lg:hidden p-1.5 text-[#9CA3AF] hover:text-white rounded-lg"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Quick Create CTA */}
          <div className="p-4 shrink-0">
            <button
              id="sidebar-create-book-btn"
              onClick={() => handleNav('create')}
              className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-[#7C3AED] to-[#3B82F6] hover:opacity-95 text-white font-semibold text-xs transition shadow-[0_0_20px_rgba(124,58,237,0.25)] flex items-center justify-center gap-2 hover:scale-[1.01] active:scale-[0.99]"
            >
              <PlusCircle className="w-4 h-4" />
              <span>+ {t('dashboard.newBookBtn')}</span>
            </button>
          </div>

          {/* Nav Navigation List with full scroll capability */}
          <div className="px-3 py-2 space-y-4 overflow-y-auto max-h-[calc(100vh-340px)] overscroll-contain">
            {/* Main */}
            <div>
              <button
                id="sidebar-nav-home"
                onClick={() => handleNav('landing')}
                className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-lg text-xs font-medium transition ${
                  currentRoute === 'landing'
                    ? 'bg-[#ffffff08] rounded-lg text-white border-l-2 border-[#7C3AED]'
                    : 'text-[#9CA3AF] hover:text-white hover:bg-white/5'
                }`}
              >
                <Home className="w-4 h-4" />
                <span>{t('navbar.home')}</span>
              </button>
              <button
                id="sidebar-nav-dashboard"
                onClick={() => handleNav('dashboard')}
                className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-lg text-xs font-medium transition mt-1 ${
                  currentRoute === 'dashboard'
                    ? 'bg-[#ffffff08] rounded-lg text-white border-l-2 border-[#7C3AED]'
                    : 'text-[#9CA3AF] hover:text-white hover:bg-white/5'
                }`}
              >
                <LayoutDashboard className="w-4 h-4" />
                <span>{t('dashboard.title')}</span>
              </button>
            </div>

            {/* MY BOOKS */}
            <div>
              <span className="px-4 text-[10px] uppercase tracking-widest text-[#4B5563] font-bold">
                {t('dashboard.allBooks')}
              </span>
              <div className="mt-1.5 space-y-0.5">
                <button
                  id="sidebar-nav-all-books"
                  onClick={() => handleBookFilter('all')}
                  className={`w-full flex items-center gap-3 px-4 py-2 rounded-lg text-xs font-medium transition ${
                    currentRoute === 'books' && bookFilter === 'all'
                      ? 'bg-[#ffffff08] rounded-lg text-white border-l-2 border-[#7C3AED]'
                      : 'text-[#9CA3AF] hover:text-white hover:bg-white/5'
                  }`}
                >
                  <BookOpen className="w-4 h-4" />
                  <span>{t('dashboard.filterAll')}</span>
                </button>
                <button
                  id="sidebar-nav-drafts"
                  onClick={() => handleBookFilter('drafts')}
                  className={`w-full flex items-center gap-3 px-4 py-2 rounded-lg text-xs font-medium transition ${
                    currentRoute === 'books' && bookFilter === 'drafts'
                      ? 'bg-[#ffffff08] rounded-lg text-white border-l-2 border-[#7C3AED]'
                      : 'text-[#9CA3AF] hover:text-white hover:bg-white/5'
                  }`}
                >
                  <FileEdit className="w-4 h-4" />
                  <span>{t('dashboard.filterDrafts')}</span>
                </button>
                <button
                  id="sidebar-nav-published"
                  onClick={() => handleBookFilter('completed')}
                  className={`w-full flex items-center gap-3 px-4 py-2 rounded-lg text-xs font-medium transition ${
                    currentRoute === 'books' && bookFilter === 'completed'
                      ? 'bg-[#ffffff08] rounded-lg text-white border-l-2 border-[#7C3AED]'
                      : 'text-[#9CA3AF] hover:text-white hover:bg-white/5'
                  }`}
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>{t('dashboard.filterCompleted')}</span>
                </button>
              </div>
            </div>

            {/* TOOLS */}
            <div>
              <span className="px-4 text-[10px] uppercase tracking-widest text-[#4B5563] font-bold">
                {t('features.badge')}
              </span>
              <div className="mt-1.5 space-y-0.5">
                <button
                  id="sidebar-nav-cover"
                  onClick={() => handleNav('cover')}
                  className={`w-full flex items-center gap-3 px-4 py-2 rounded-lg text-xs font-medium transition ${
                    currentRoute === 'cover'
                      ? 'bg-[#ffffff08] rounded-lg text-white border-l-2 border-[#7C3AED]'
                      : 'text-[#9CA3AF] hover:text-white hover:bg-white/5'
                  }`}
                >
                  <Palette className="w-4 h-4" />
                  <span>{t('coverStudio.title')}</span>
                </button>
                <button
                  id="sidebar-nav-mockups"
                  onClick={() => handleNav('mockups')}
                  className={`w-full flex items-center gap-3 px-4 py-2 rounded-lg text-xs font-medium transition ${
                    currentRoute === 'mockups'
                      ? 'bg-[#ffffff08] rounded-lg text-white border-l-2 border-[#7C3AED]'
                      : 'text-[#9CA3AF] hover:text-white hover:bg-white/5'
                  }`}
                >
                  <Layers className="w-4 h-4" />
                  <span>{t('mockups.title')}</span>
                </button>
              </div>
            </div>

            {/* ACCOUNT */}
            <div>
              <span className="px-4 text-[10px] uppercase tracking-widest text-[#4B5563] font-bold">
                {t('settings.title')}
              </span>
              <div className="mt-1.5 space-y-0.5">
                <button
                  id="sidebar-nav-settings"
                  onClick={() => handleNav('settings')}
                  className={`w-full flex items-center gap-3 px-4 py-2 rounded-lg text-xs font-medium transition ${
                    currentRoute === 'settings'
                      ? 'bg-[#ffffff08] rounded-lg text-white border-l-2 border-[#7C3AED]'
                      : 'text-[#9CA3AF] hover:text-white hover:bg-white/5'
                  }`}
                >
                  <Settings className="w-4 h-4" />
                  <span>{t('settings.title')}</span>
                </button>
                <button
                  id="sidebar-nav-billing"
                  onClick={() => handleNav('billing')}
                  className={`w-full flex items-center gap-3 px-4 py-2 rounded-lg text-xs font-medium transition ${
                    currentRoute === 'billing'
                      ? 'bg-[#ffffff08] rounded-lg text-white border-l-2 border-[#7C3AED]'
                      : 'text-[#9CA3AF] hover:text-white hover:bg-white/5'
                  }`}
                >
                  <CreditCard className="w-4 h-4" />
                  <span>{t('billing.title')}</span>
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom User / Plan Summary */}
        <div className="p-4 border-t border-[#ffffff08] space-y-3">
          {/* AI Generations usage bar in Immersive UI style */}
          <div className="p-4 rounded-xl bg-[#121214] border border-[#ffffff08]">
            <div className="flex justify-between items-center text-[11px] font-bold text-[#9CA3AF] mb-2">
              <span className="flex items-center gap-1.5">
                <Sparkles className="w-3 h-3 text-[#7C3AED]" />
                {t('dashboard.stats.aiQuotas')}
              </span>
              <span className="font-mono text-white">
                {user.aiGenerationsUsed} / {user.aiGenerationsLimit}
              </span>
            </div>
            <div className="h-1.5 w-full bg-[#1F1F23] rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-[#7C3AED] to-[#3B82F6] rounded-full transition-all duration-500"
                style={{
                  width: `${Math.min(100, (user.aiGenerationsUsed / user.aiGenerationsLimit) * 100)}%`
                }}
              />
            </div>
            <div className="flex items-center justify-between mt-2">
              <p className="text-[10px] text-[#4B5563]">{t('common.resetsMonthly')}</p>
              {user.plan === 'free' && (
                <button
                  onClick={() => handleNav('billing')}
                  className="text-[10px] text-[#7C3AED] hover:text-[#3B82F6] font-semibold tracking-wider uppercase transition"
                >
                  {t('billing.upgradeCta')} →
                </button>
              )}
            </div>
          </div>

          {/* User profile row in Immersive UI style */}
          <div className="flex items-center justify-between px-2 pt-1">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-8 h-8 rounded-full bg-[#1F1F23] flex items-center justify-center text-xs font-semibold text-white border border-[#ffffff10] shrink-0">
                {user.name.slice(0, 2).toUpperCase()}
              </div>
              <div className="min-w-0">
                <p className="text-xs font-semibold text-white truncate">{user.name}</p>
                <p className="text-[10px] text-[#4B5563] capitalize">{t('common.planLabel', { plan: user.plan })}</p>
              </div>
            </div>
            <button
              id="sidebar-logout-icon-btn"
              onClick={onLogout}
              className="p-1.5 text-[#9CA3AF] hover:text-rose-400 rounded-lg transition"
              title={t('navbar.logout')}
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>

          {/* Explicit Full-Width Logout Button */}
          <button
            id="sidebar-logout-btn"
            onClick={onLogout}
            className="w-full flex items-center justify-center gap-2 py-2 px-3 rounded-lg text-xs font-medium text-rose-400 hover:text-rose-300 bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/20 transition cursor-pointer"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>{t('navbar.logout')}</span>
          </button>
        </div>
      </aside>
    </>
  );
};
