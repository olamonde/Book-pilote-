import React, { useState } from 'react';
import { Compass, Menu, X, ArrowRight, BookOpen } from 'lucide-react';
import { ViewRoute } from '../../types';
import { useTranslation } from '../../i18n';
import { LanguageSelector } from '../common/LanguageSelector';

interface NavbarProps {
  currentRoute: ViewRoute;
  onNavigate: (route: ViewRoute) => void;
  isAuthenticated: boolean;
  onOpenAuth: (mode: 'login' | 'signup') => void;
  onLogout?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentRoute,
  onNavigate,
  isAuthenticated,
  onOpenAuth,
  onLogout
}) => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { t } = useTranslation();

  const navLinks = [
    { label: t('navbar.home'), href: '#hero' },
    { label: t('navbar.product'), href: '#features' },
    { label: t('navbar.howItWorks'), href: '#how-it-works' },
    { label: t('navbar.pricing'), href: '#pricing' },
    { label: t('navbar.examples'), href: '#examples' },
    { label: t('navbar.faq'), href: '#faq' }
  ];

  const handleLinkClick = (href: string) => {
    setMobileMenuOpen(false);
    if (href === '#hero') {
      if (currentRoute !== 'landing') {
        onNavigate('landing');
      }
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }

    if (currentRoute !== 'landing') {
      onNavigate('landing');
      setTimeout(() => {
        const el = document.querySelector(href);
        if (el) el.scrollIntoView({ behavior: 'smooth' });
      }, 100);
    } else {
      const el = document.querySelector(href);
      if (el) el.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <header className="sticky top-0 z-40 w-full border-b border-[#ffffff08] bg-[#050505]/85 backdrop-blur-xl transition-all">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between">
        {/* Logo */}
        <div
          onClick={() => onNavigate('landing')}
          className="flex items-center gap-3 cursor-pointer group select-none"
          id="brand-logo"
        >
          <div className="w-10 h-10 bg-gradient-to-br from-[#7C3AED] to-[#3B82F6] rounded-xl flex items-center justify-center shadow-[0_0_20px_rgba(124,58,237,0.3)] text-white">
            <Compass className="w-5 h-5 group-hover:rotate-45 transition-transform duration-500" />
          </div>
          <div className="flex flex-col">
            <span className="font-bold tracking-tight text-lg text-white font-sans flex items-center gap-1.5">
              BOOK PILOT
              <span className="inline-block w-1.5 h-1.5 rounded-full bg-[#7C3AED] animate-pulse" />
            </span>
            <span className="text-[9px] uppercase tracking-wider text-[#7C3AED] font-mono -mt-0.5">
              {t('common.appTagline')}
            </span>
          </div>
        </div>

        {/* Desktop Navigation Links */}
        <nav className="hidden md:flex items-center gap-8 text-sm font-medium text-slate-300">
          {navLinks.map((link) => (
            <button
              key={link.href}
              onClick={() => handleLinkClick(link.href)}
              className="hover:text-white transition-colors duration-200"
            >
              {link.label}
            </button>
          ))}
        </nav>

        {/* Right CTA / Auth & Language Selector */}
        <div className="hidden md:flex items-center gap-3.5">
          <LanguageSelector variant="compact" />

          {isAuthenticated ? (
            <div className="flex items-center gap-3">
              <button
                id="nav-go-dashboard"
                onClick={() => onNavigate('dashboard')}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-medium text-sm shadow-lg shadow-purple-600/25 transition-all duration-200 hover:scale-[1.02] active:scale-[0.98]"
              >
                <BookOpen className="w-4 h-4" />
                <span>{t('navbar.goToStudio')}</span>
              </button>
              {onLogout && (
                <button
                  id="nav-logout-btn"
                  onClick={onLogout}
                  className="text-xs text-rose-400 hover:text-rose-300 py-2 px-2.5 rounded-lg hover:bg-rose-500/10 transition"
                  title={t('navbar.logout')}
                >
                  {t('navbar.logout')}
                </button>
              )}
            </div>
          ) : (
            <>
              <button
                id="nav-login-btn"
                onClick={() => onOpenAuth('login')}
                className="text-sm font-medium text-slate-300 hover:text-white px-3 py-2 transition"
              >
                {t('navbar.login')}
              </button>
              <button
                id="nav-signup-btn"
                onClick={() => onOpenAuth('signup')}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-medium text-sm shadow-lg shadow-purple-600/30 transition-all duration-200 hover:scale-[1.02] active:scale-[0.98]"
              >
                <span>{t('navbar.getStarted')}</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </>
          )}
        </div>

        {/* Mobile menu hamburger toggle & mobile lang */}
        <div className="md:hidden flex items-center gap-2">
          <LanguageSelector variant="compact" />
          <button
            id="mobile-menu-toggle"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="p-2 text-slate-400 hover:text-white rounded-lg focus:outline-hidden"
            aria-label={t('navbar.menu')}
          >
            {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>
      </div>

      {/* Mobile Drawer Menu */}
      {mobileMenuOpen && (
        <div className="md:hidden border-b border-white/10 bg-[#090a0f] px-6 py-6 space-y-4 animate-in slide-in-from-top duration-200">
          <div className="flex flex-col space-y-3">
            {navLinks.map((link) => (
              <button
                key={link.href}
                onClick={() => handleLinkClick(link.href)}
                className="text-left text-base font-medium text-slate-300 hover:text-white py-2"
              >
                {link.label}
              </button>
            ))}
          </div>
          <div className="pt-4 border-t border-white/10 flex flex-col gap-3">
            {isAuthenticated ? (
              <>
                <button
                  onClick={() => {
                    setMobileMenuOpen(false);
                    onNavigate('dashboard');
                  }}
                  className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-purple-600 text-white font-medium text-sm"
                >
                  <BookOpen className="w-4 h-4" />
                  <span>{t('navbar.goToStudio')}</span>
                </button>
                {onLogout && (
                  <button
                    onClick={() => {
                      setMobileMenuOpen(false);
                      onLogout();
                    }}
                    className="w-full py-2.5 rounded-xl border border-rose-500/30 bg-rose-500/10 text-rose-300 font-medium text-sm hover:bg-rose-500/20"
                  >
                    {t('navbar.logout')}
                  </button>
                )}
              </>
            ) : (
              <>
                <button
                  onClick={() => {
                    setMobileMenuOpen(false);
                    onOpenAuth('login');
                  }}
                  className="w-full py-2.5 rounded-xl border border-white/10 text-white font-medium text-sm hover:bg-white/5"
                >
                  {t('navbar.login')}
                </button>
                <button
                  onClick={() => {
                    setMobileMenuOpen(false);
                    onOpenAuth('signup');
                  }}
                  className="w-full py-2.5 rounded-xl bg-purple-600 text-white font-medium text-sm shadow-lg shadow-purple-600/30"
                >
                  {t('navbar.getStarted')}
                </button>
              </>
            )}
          </div>
        </div>
      )}
    </header>
  );
};
