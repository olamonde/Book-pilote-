import { SupportedLocale } from './types';

export const SUPPORTED_LOCALES: SupportedLocale[] = ['fr', 'en', 'es', 'pt'];

export const STORAGE_KEY_INTERFACE_LANG = 'bookpilot_interface_lang';
export const STORAGE_KEY_CONTENT_LANG = 'bookpilot_content_lang';

/**
 * Detects the preferred interface language following the strict precedence:
 * 1. Explicit user choice stored in localStorage
 * 2. Browser / device preferred languages (navigator.languages / navigator.language)
 * 3. Default fallback to English ('en')
 */
export function detectInitialLanguage(): SupportedLocale {
  if (typeof window === 'undefined') {
    return 'en';
  }

  // 1. Check local storage
  try {
    const saved = localStorage.getItem(STORAGE_KEY_INTERFACE_LANG);
    if (saved && SUPPORTED_LOCALES.includes(saved as SupportedLocale)) {
      return saved as SupportedLocale;
    }
  } catch (e) {
    console.warn('[i18n] Failed to access localStorage:', e);
  }

  // 2. Check browser languages
  try {
    const browserLanguages: readonly string[] =
      navigator.languages && navigator.languages.length > 0
        ? navigator.languages
        : [navigator.language || 'en'];

    for (const rawLang of browserLanguages) {
      if (!rawLang) continue;
      const normalized = rawLang.toLowerCase().trim();
      const prefix = normalized.split('-')[0].split('_')[0];

      if (SUPPORTED_LOCALES.includes(prefix as SupportedLocale)) {
        return prefix as SupportedLocale;
      }
    }
  } catch (e) {
    console.warn('[i18n] Failed to detect browser language:', e);
  }

  // 3. Fallback to English
  return 'en';
}

/**
 * Saves the user's manual language selection to localStorage
 */
export function saveLanguagePreference(locale: SupportedLocale): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEY_INTERFACE_LANG, locale);
    // Also update document lang attribute for accessibility
    document.documentElement.lang = locale;
  } catch (e) {
    console.warn('[i18n] Failed to save language preference:', e);
  }
}
