import React, { useState, useRef, useEffect } from 'react';
import { Globe, Check, ChevronDown } from 'lucide-react';
import { useLanguage } from '../../i18n';
import { SupportedLocale } from '../../i18n/types';

interface LanguageSelectorProps {
  variant?: 'compact' | 'full' | 'dropdown';
  className?: string;
  showFlag?: boolean;
}

export const LanguageSelector: React.FC<LanguageSelectorProps> = ({
  variant = 'compact',
  className = '',
  showFlag = true
}) => {
  const { interfaceLanguage, setInterfaceLanguage, availableInterfaceLanguages, currentLanguageMeta, t } = useLanguage();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('keydown', handleEscape);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [isOpen]);

  const handleSelect = (code: SupportedLocale) => {
    setInterfaceLanguage(code);
    setIsOpen(false);
  };

  // Variant 'full': radio/card list for Settings page
  if (variant === 'full') {
    return (
      <div className={`grid grid-cols-2 sm:grid-cols-4 gap-3 ${className}`}>
        {availableInterfaceLanguages.map((lang) => {
          const isSelected = lang.code === interfaceLanguage;
          return (
            <button
              key={lang.code}
              type="button"
              onClick={() => handleSelect(lang.code)}
              className={`p-3.5 rounded-xl border text-left transition-all flex items-center justify-between ${
                isSelected
                  ? 'bg-purple-600/15 border-purple-500/60 shadow-lg shadow-purple-500/10'
                  : 'bg-white/[0.03] border-white/10 hover:border-white/20 hover:bg-white/[0.06]'
              }`}
            >
              <div className="flex items-center space-x-3">
                <span className="text-xl" role="img" aria-label={lang.name}>
                  {lang.flag}
                </span>
                <div>
                  <div className={`text-sm font-medium ${isSelected ? 'text-purple-300 font-semibold' : 'text-slate-200'}`}>
                    {lang.nativeName}
                  </div>
                  <div className="text-[11px] text-slate-400">
                    {lang.name}
                  </div>
                </div>
              </div>
              {isSelected && (
                <div className="w-5 h-5 rounded-full bg-purple-500/20 text-purple-400 flex items-center justify-center">
                  <Check className="w-3.5 h-3.5" />
                </div>
              )}
            </button>
          );
        })}
      </div>
    );
  }

  // Variant 'compact' / 'dropdown': sleek button with popup menu
  return (
    <div className={`relative inline-block text-left ${className}`} ref={dropdownRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        aria-label={t('languageSelector.ariaLabel')}
        aria-expanded={isOpen}
        aria-haspopup="true"
        className="flex items-center space-x-2 px-2.5 py-1.5 rounded-lg text-xs font-medium text-slate-300 hover:text-white bg-white/[0.05] hover:bg-white/[0.1] border border-white/10 hover:border-white/20 transition-all shadow-sm focus:outline-none focus:ring-2 focus:ring-purple-500/50"
      >
        <Globe className="w-3.5 h-3.5 text-purple-400" />
        {showFlag && <span className="text-xs">{currentLanguageMeta.flag}</span>}
        <span className="uppercase tracking-wider font-mono font-semibold text-[11px]">
          {currentLanguageMeta.code}
        </span>
        <ChevronDown className={`w-3 h-3 text-slate-400 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <div
          role="menu"
          aria-orientation="vertical"
          className="absolute right-0 mt-1.5 w-44 rounded-xl bg-[#12131a] border border-white/15 shadow-2xl shadow-black/80 py-1 z-50 animate-in fade-in zoom-in-95 duration-100 backdrop-blur-md"
        >
          <div className="px-3 py-1.5 border-b border-white/5 text-[10px] uppercase font-mono tracking-wider text-slate-400">
            {t('languageSelector.title')}
          </div>
          {availableInterfaceLanguages.map((lang) => {
            const isSelected = lang.code === interfaceLanguage;
            return (
              <button
                key={lang.code}
                type="button"
                role="menuitem"
                onClick={() => handleSelect(lang.code)}
                className={`w-full flex items-center justify-between px-3 py-2 text-xs text-left transition-colors ${
                  isSelected
                    ? 'bg-purple-600/20 text-purple-300 font-semibold'
                    : 'text-slate-300 hover:bg-white/[0.07] hover:text-white'
                }`}
              >
                <div className="flex items-center space-x-2.5">
                  <span className="text-sm">{lang.flag}</span>
                  <span>{lang.nativeName}</span>
                </div>
                {isSelected && <Check className="w-3.5 h-3.5 text-purple-400 shrink-0" />}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
};
