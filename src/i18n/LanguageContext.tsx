import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import { SupportedLocale, LanguageMeta, ContentLanguageOption } from './types';
import { detectInitialLanguage, saveLanguagePreference, STORAGE_KEY_CONTENT_LANG } from './detection';
import { translations, en } from './translations';
import { CONTENT_LANGUAGES, LANGUAGES_META } from './contentLanguages';

interface LanguageContextType {
  // Interface Language
  interfaceLanguage: SupportedLocale;
  setInterfaceLanguage: (locale: SupportedLocale) => void;
  availableInterfaceLanguages: LanguageMeta[];
  currentLanguageMeta: LanguageMeta;

  // Content Language (For book generation)
  contentLanguage: string;
  setContentLanguage: (lang: string) => void;
  availableContentLanguages: ContentLanguageOption[];

  // Translation function
  t: (key: string, params?: Record<string, string | number>) => string;

  // Formatters
  formatDate: (date: Date | string | number, options?: Intl.DateTimeFormatOptions) => string;
  formatNumber: (value: number, options?: Intl.NumberFormatOptions) => string;
  formatCurrency: (amount: number, currency?: string) => string;
}

const LanguageContext = createContext<LanguageContextType | null>(null);

function getNestedValue(obj: any, path: string): string | undefined {
  if (!obj || typeof obj !== 'object') return undefined;
  const keys = path.split('.');
  let current: any = obj;

  for (const k of keys) {
    if (current && typeof current === 'object' && k in current) {
      current = current[k];
    } else {
      return undefined;
    }
  }

  return typeof current === 'string' ? current : undefined;
}

export const LanguageProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [interfaceLanguage, setInterfaceLanguageState] = useState<SupportedLocale>(() => detectInitialLanguage());

  // Default book content language (can be stored independently)
  const [contentLanguage, setContentLanguageState] = useState<string>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem(STORAGE_KEY_CONTENT_LANG);
      if (saved) return saved;
    }
    // Set initial default content language matching interface language or English
    const initialLocale = detectInitialLanguage();
    if (initialLocale === 'fr') return 'Français';
    if (initialLocale === 'es') return 'Español';
    if (initialLocale === 'pt') return 'Português';
    return 'English';
  });

  // Keep document lang attribute in sync
  useEffect(() => {
    if (typeof document !== 'undefined') {
      document.documentElement.lang = interfaceLanguage;
      document.documentElement.dir = LANGUAGES_META[interfaceLanguage]?.direction || 'ltr';
    }
  }, [interfaceLanguage]);

  const setInterfaceLanguage = useCallback((locale: SupportedLocale) => {
    setInterfaceLanguageState(locale);
    saveLanguagePreference(locale);
  }, []);

  const setContentLanguage = useCallback((lang: string) => {
    setContentLanguageState(lang);
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem(STORAGE_KEY_CONTENT_LANG, lang);
      } catch (e) {
        console.warn('[i18n] Failed to save content language:', e);
      }
    }
  }, []);

  // Translation core function with resilient fallback to English
  const t = useCallback(
    (key: string, params?: Record<string, string | number>): string => {
      const activeDict = translations[interfaceLanguage];
      let value = getNestedValue(activeDict, key);

      // Resilient Fallback 1: English dictionary
      if (value === undefined && interfaceLanguage !== 'en') {
        value = getNestedValue(en, key);
      }

      // Resilient Fallback 2: Clean readable string from key path
      if (value === undefined) {
        const segments = key.split('.');
        const lastSegment = segments[segments.length - 1];
        // Humanize camelCase or snake_case key as readable text
        value = lastSegment
          .replace(/([A-Z])/g, ' $1')
          .replace(/_/g, ' ')
          .trim();
        value = value.charAt(0).toUpperCase() + value.slice(1);
      }

      // Replace interpolation parameters e.g. {count}, {{count}}, {name}, {{name}}
      if (params && typeof value === 'string') {
        Object.entries(params).forEach(([paramKey, paramValue]) => {
          value = (value as string)
            .replace(new RegExp(`\\{\\{${paramKey}\\}\\}`, 'g'), String(paramValue))
            .replace(new RegExp(`\\{${paramKey}\\}`, 'g'), String(paramValue));
        });
      }

      return value;
    },
    [interfaceLanguage]
  );

  // Formatter: Date
  const formatDate = useCallback(
    (date: Date | string | number, options?: Intl.DateTimeFormatOptions): string => {
      try {
        const d = typeof date === 'string' || typeof date === 'number' ? new Date(date) : date;
        if (isNaN(d.getTime())) return '';
        return new Intl.DateTimeFormat(interfaceLanguage, options || {
          year: 'numeric',
          month: 'short',
          day: 'numeric'
        }).format(d);
      } catch {
        return String(date);
      }
    },
    [interfaceLanguage]
  );

  // Formatter: Number
  const formatNumber = useCallback(
    (value: number, options?: Intl.NumberFormatOptions): string => {
      try {
        return new Intl.NumberFormat(interfaceLanguage, options).format(value);
      } catch {
        return String(value);
      }
    },
    [interfaceLanguage]
  );

  // Formatter: Currency
  const formatCurrency = useCallback(
    (amount: number, currency: string = 'EUR'): string => {
      try {
        return new Intl.NumberFormat(interfaceLanguage, {
          style: 'currency',
          currency: currency,
          maximumFractionDigits: amount % 1 === 0 ? 0 : 2
        }).format(amount);
      } catch {
        return `${amount} ${currency}`;
      }
    },
    [interfaceLanguage]
  );

  const availableInterfaceLanguages = useMemo(() => {
    return Object.values(LANGUAGES_META);
  }, []);

  const currentLanguageMeta = useMemo(() => {
    return LANGUAGES_META[interfaceLanguage] || LANGUAGES_META.en;
  }, [interfaceLanguage]);

  return (
    <LanguageContext.Provider
      value={{
        interfaceLanguage,
        setInterfaceLanguage,
        availableInterfaceLanguages,
        currentLanguageMeta,
        contentLanguage,
        setContentLanguage,
        availableContentLanguages: CONTENT_LANGUAGES,
        t,
        formatDate,
        formatNumber,
        formatCurrency
      }}
    >
      {children}
    </LanguageContext.Provider>
  );
};

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
}

export function useTranslation() {
  const { t, interfaceLanguage, formatDate, formatNumber, formatCurrency } = useLanguage();
  return { t, interfaceLanguage, formatDate, formatNumber, formatCurrency };
}
