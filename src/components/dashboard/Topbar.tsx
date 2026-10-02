import React, { useState } from 'react';
import { Menu, Bell, Plus, Home, LogOut, Settings, CreditCard } from 'lucide-react';
import { User, ViewRoute } from '../../types';
import { useTranslation } from '../../i18n';
import { LanguageSelector } from '../common/LanguageSelector';

interface TopbarProps {
  user: User;
  onOpenMobileMenu: () => void;
  onNavigate: (route: ViewRoute) => void;
  onQuickCreate: () => void;
  onLogout?: () => void;
}

export const Topbar: React.FC<TopbarProps> = ({
  user,
  onOpenMobileMenu,
  onNavigate,
  onQuickCreate,
  onLogout
}) => {
  const { t } = useTranslation();
  const [showNotifications, setShowNotifications] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [notifications, setNotifications] = useState([
    {
      id: 'n1',
      title: t('dashboard.notifications.welcomeTitle'),
      desc: t('dashboard.notifications.welcomeDesc'),
      time: t('dashboard.notifications.justNow'),
      read: false
    }
  ]);

  const unreadCount = notifications.filter((n) => !n.read).length;

  const markAllRead = () => {
    setNotifications(notifications.map((n) => ({ ...n, read: true })));
  };

  return (
    <header className="sticky top-0 z-30 h-16 bg-[#080808]/90 border-b border-[#ffffff08] backdrop-blur-xl px-4 sm:px-8 flex items-center justify-between">
      <div className="flex items-center gap-4">
        {/* Mobile menu toggle */}
        <button
          onClick={onOpenMobileMenu}
          className="lg:hidden p-2 text-[#9CA3AF] hover:text-white rounded-lg hover:bg-white/5 transition"
          aria-label="Open sidebar menu"
        >
          <Menu className="w-5 h-5" />
        </button>

        {/* Global Search / Studio breadcrumb */}
        <div className="hidden sm:flex items-center gap-2 text-xs font-mono text-[#9CA3AF]">
          <button
            onClick={() => onNavigate('landing')}
            className="text-white font-bold hover:text-[#7C3AED] transition flex items-center gap-1.5"
            title={t('navbar.home')}
          >
            <Home className="w-3.5 h-3.5 text-[#7C3AED]" />
            <span>Book Pilot</span>
          </button>
          <span className="text-[#4B5563]">/</span>
          <span className="text-[#7C3AED] capitalize">{user.plan} {t('navbar.workspace')}</span>
        </div>
      </div>

      {/* Right Controls */}
      <div className="flex items-center gap-3 sm:gap-4">
        {/* Language Selector in Topbar */}
        <LanguageSelector variant="compact" />

        {/* Support & Navigation links */}
        <div className="hidden md:flex items-center gap-5 text-sm font-medium">
          <button
            onClick={() => onNavigate('landing')}
            className="text-[#9CA3AF] hover:text-white transition-colors text-xs flex items-center gap-1.5"
          >
            <Home className="w-3.5 h-3.5" />
            <span>{t('navbar.home')}</span>
          </button>
          <button
            onClick={() => onNavigate('dashboard')}
            className="text-[#9CA3AF] hover:text-white transition-colors text-xs"
          >
            {t('dashboard.title')}
          </button>
          <button
            onClick={() => onNavigate('settings')}
            className="text-[#9CA3AF] hover:text-white transition-colors text-xs"
          >
            {t('common.support')}
          </button>
        </div>

        {/* + Create New Book action */}
        <button
          id="topbar-new-book-btn"
          onClick={onQuickCreate}
          className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-gradient-to-r from-[#7C3AED] to-[#3B82F6] hover:opacity-95 text-white font-semibold text-xs shadow-[0_0_15px_rgba(124,58,237,0.3)] transition hover:scale-[1.02] active:scale-[0.98]"
        >
          <Plus className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">{t('dashboard.newBookBtn')}</span>
          <span className="sm:hidden">{t('common.new')}</span>
        </button>

        {/* Notifications Bell */}
        <div className="relative">
          <button
            id="notifications-bell-btn"
            onClick={() => setShowNotifications(!showNotifications)}
            className="w-8 h-8 rounded-full bg-[#1F1F23] flex items-center justify-center text-[#9CA3AF] hover:text-white hover:bg-[#28282e] transition relative"
            aria-label={t('dashboard.notifications.title')}
          >
            <Bell className="w-4 h-4" />
            {unreadCount > 0 && (
              <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-[#7C3AED] ring-2 ring-[#080808]" />
            )}
          </button>

          {showNotifications && (
            <div className="absolute right-0 mt-2 w-80 rounded-2xl bg-[#0C0C0E] border border-[#ffffff10] shadow-2xl p-4 z-50 animate-in fade-in duration-150">
              <div className="flex items-center justify-between pb-3 border-b border-[#ffffff08]">
                <div className="flex items-center gap-2">
                  <h4 className="text-xs font-bold text-white uppercase tracking-wider font-mono">
                    {t('dashboard.notifications.title')}
                  </h4>
                  {unreadCount > 0 && (
                    <span className="px-1.5 py-0.5 rounded-full bg-[#7C3AED]/20 text-[#7C3AED] text-[10px] font-mono">
                      {t('dashboard.notifications.newBadge', { count: unreadCount })}
                    </span>
                  )}
                </div>
                {unreadCount > 0 && (
                  <button
                    onClick={markAllRead}
                    className="text-[10px] text-[#7C3AED] hover:text-[#3B82F6] font-medium"
                  >
                    {t('dashboard.notifications.markAllRead')}
                  </button>
                )}
              </div>

              <div className="mt-3 space-y-2 max-h-64 overflow-y-auto">
                {notifications.map((n) => (
                  <div
                    key={n.id}
                    className={`p-2.5 rounded-xl border transition ${
                      n.read
                        ? 'bg-[#121214] border-[#ffffff08] opacity-70'
                        : 'bg-[#121214] border-[#7C3AED]/30'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <p className="text-xs font-semibold text-white">{n.title}</p>
                      <span className="text-[9px] text-[#4B5563] font-mono">{n.time}</span>
                    </div>
                    <p className="text-[11px] text-[#9CA3AF] leading-snug">{n.desc}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* User Pill & Menu */}
        <div className="relative">
          <div
            id="topbar-user-pill-btn"
            onClick={() => setShowUserMenu(!showUserMenu)}
            className="flex items-center gap-2.5 pl-1.5 pr-3 py-1 rounded-xl bg-[#121214] border border-[#ffffff08] hover:border-[#7C3AED]/40 cursor-pointer transition select-none"
          >
            <div className="w-6 h-6 rounded-full bg-[#1F1F23] flex items-center justify-center text-[10px] font-bold text-white border border-[#ffffff10]">
              {user.name.slice(0, 2).toUpperCase()}
            </div>
            <span className="text-xs font-semibold text-white hidden md:inline truncate max-w-[120px]">
              {user.name}
            </span>
            <span className="text-[9px] uppercase font-mono px-1.5 py-0.2 rounded bg-[#ffffff08] text-[#7C3AED] border border-[#7C3AED]/30">
              {user.plan}
            </span>
          </div>

          {showUserMenu && (
            <div className="absolute right-0 mt-2 w-56 rounded-2xl bg-[#0C0C0E] border border-[#ffffff15] shadow-2xl p-2 z-50 animate-in fade-in duration-150">
              <div className="px-3 py-2 border-b border-white/5">
                <p className="text-xs font-semibold text-white truncate">{user.name}</p>
                <p className="text-[10px] text-[#9CA3AF] truncate">{user.email}</p>
              </div>

              <div className="py-1 space-y-0.5">
                <button
                  onClick={() => {
                    setShowUserMenu(false);
                    onNavigate('landing');
                  }}
                  className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs text-[#9CA3AF] hover:text-white hover:bg-white/5 transition"
                >
                  <Home className="w-3.5 h-3.5" />
                  <span>{t('navbar.home')}</span>
                </button>
                <button
                  onClick={() => {
                    setShowUserMenu(false);
                    onNavigate('settings');
                  }}
                  className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs text-[#9CA3AF] hover:text-white hover:bg-white/5 transition"
                >
                  <Settings className="w-3.5 h-3.5" />
                  <span>{t('settings.title')}</span>
                </button>
                <button
                  onClick={() => {
                    setShowUserMenu(false);
                    onNavigate('billing');
                  }}
                  className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs text-[#9CA3AF] hover:text-white hover:bg-white/5 transition"
                >
                  <CreditCard className="w-3.5 h-3.5" />
                  <span>{t('billing.title')}</span>
                </button>
              </div>

              {onLogout && (
                <div className="pt-1 border-t border-white/5">
                  <button
                    id="topbar-menu-logout-btn"
                    onClick={() => {
                      setShowUserMenu(false);
                      onLogout();
                    }}
                    className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs text-rose-400 hover:text-rose-300 hover:bg-rose-500/10 transition cursor-pointer"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                    <span>{t('navbar.logout')}</span>
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
