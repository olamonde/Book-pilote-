import React from 'react';
import { Compass, Sparkles, Heart } from 'lucide-react';
import { ViewRoute } from '../../types';
import { useTranslation } from '../../i18n';

interface FooterProps {
  onNavigate: (route: ViewRoute) => void;
  onOpenLegal: (type: 'privacy' | 'terms' | 'cookies' | 'refund') => void;
}

export const Footer: React.FC<FooterProps> = ({ onNavigate, onOpenLegal }) => {
  const { t } = useTranslation();

  return (
    <footer className="bg-[#06070a] border-t border-white/10 text-slate-400 text-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-10">
          {/* Col 1: Brand */}
          <div className="space-y-4 md:col-span-1">
            <div
              onClick={() => onNavigate('landing')}
              className="flex items-center gap-3 cursor-pointer select-none"
            >
              <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-purple-600 to-indigo-600 flex items-center justify-center text-white">
                <Compass className="w-4 h-4" />
              </div>
              <span className="font-extrabold tracking-wider text-base text-white font-sans">
                BOOK PILOT
              </span>
            </div>
            <p className="text-xs text-slate-400 leading-relaxed">
              {t('footer.tagline')}
            </p>
            <div className="flex items-center gap-2 text-xs text-[#7C3AED] font-mono">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span>{t('footer.cloudNotice')}</span>
            </div>
          </div>

          {/* Col 2: Product */}
          <div>
            <h4 className="text-xs font-mono uppercase tracking-widest text-white font-semibold mb-4">
              {t('footer.productTitle')}
            </h4>
            <ul className="space-y-2.5 text-xs">
              <li>
                <button onClick={() => onNavigate('dashboard')} className="hover:text-white transition">
                  {t('footer.aiStudio')}
                </button>
              </li>
              <li>
                <button onClick={() => onNavigate('dashboard')} className="hover:text-white transition">
                  {t('footer.copilot')}
                </button>
              </li>
              <li>
                <button onClick={() => onNavigate('dashboard')} className="hover:text-white transition">
                  {t('footer.coverGenerator')}
                </button>
              </li>
              <li>
                <button onClick={() => onNavigate('dashboard')} className="hover:text-white transition">
                  {t('features.mockups.title')}
                </button>
              </li>
              <li>
                <button onClick={() => onNavigate('pricing')} className="hover:text-white transition">
                  {t('navbar.pricing')}
                </button>
              </li>
            </ul>
          </div>

          {/* Col 3: Resources */}
          <div>
            <h4 className="text-xs font-mono uppercase tracking-widest text-white font-semibold mb-4">
              {t('navbar.howItWorks')}
            </h4>
            <ul className="space-y-2.5 text-xs">
              <li>
                <a href="#how-it-works" className="hover:text-white transition">
                  {t('howItWorks.title')}
                </a>
              </li>
              <li>
                <a href="#examples" className="hover:text-white transition">
                  {t('showcase.title')}
                </a>
              </li>
              <li>
                <a href="#faq" className="hover:text-white transition">
                  {t('faq.title')}
                </a>
              </li>
              <li>
                <button onClick={() => onNavigate('settings')} className="hover:text-white transition">
                  {t('settings.aiPreferences.title')}
                </button>
              </li>
            </ul>
          </div>

          {/* Col 4: Legal */}
          <div>
            <h4 className="text-xs font-mono uppercase tracking-widest text-white font-semibold mb-4">
              {t('footer.legalTitle')}
            </h4>
            <ul className="space-y-2.5 text-xs">
              <li>
                <button
                  id="footer-privacy"
                  onClick={() => onOpenLegal('privacy')}
                  className="hover:text-white transition"
                >
                  {t('footer.privacy')}
                </button>
              </li>
              <li>
                <button
                  id="footer-terms"
                  onClick={() => onOpenLegal('terms')}
                  className="hover:text-white transition"
                >
                  {t('footer.terms')}
                </button>
              </li>
              <li>
                <button
                  id="footer-cookies"
                  onClick={() => onOpenLegal('cookies')}
                  className="hover:text-white transition"
                >
                  {t('footer.cookies')}
                </button>
              </li>
              <li>
                <button
                  id="footer-refund"
                  onClick={() => onOpenLegal('refund')}
                  className="hover:text-white transition"
                >
                  {t('footer.refund')}
                </button>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="mt-12 pt-8 border-t border-white/5 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-500">
          <p>© {new Date().getFullYear()} Book Pilot. {t('footer.rights')}</p>
          <div className="flex items-center gap-1">
            <span>{t('footer.madeWith')}</span>
          </div>
        </div>
      </div>
    </footer>
  );
};
