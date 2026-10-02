import { ContentLanguageOption, CountryOption, CurrencyOption, LanguageMeta } from './types';

export const LANGUAGES_META: Record<string, LanguageMeta> = {
  fr: {
    code: 'fr',
    name: 'French',
    nativeName: 'Français',
    flag: '🇫🇷',
    direction: 'ltr'
  },
  en: {
    code: 'en',
    name: 'English',
    nativeName: 'English',
    flag: '🇬🇧',
    direction: 'ltr'
  },
  es: {
    code: 'es',
    name: 'Spanish',
    nativeName: 'Español',
    flag: '🇪🇸',
    direction: 'ltr'
  },
  pt: {
    code: 'pt',
    name: 'Portuguese',
    nativeName: 'Português',
    flag: '🇵🇹',
    direction: 'ltr'
  }
};

/**
 * Supported Book Content Generation Languages
 * Independent of the interface language.
 */
export const CONTENT_LANGUAGES: ContentLanguageOption[] = [
  { id: 'fr', code: 'Français', name: 'French', nativeName: 'Français', flag: '🇫🇷' },
  { id: 'en', code: 'English', name: 'English', nativeName: 'English', flag: '🇬🇧' },
  { id: 'es', code: 'Español', name: 'Spanish', nativeName: 'Español', flag: '🇪🇸' },
  { id: 'pt', code: 'Português', name: 'Portuguese', nativeName: 'Português', flag: '🇵🇹' },
  { id: 'de', code: 'Deutsch', name: 'German', nativeName: 'Deutsch', flag: '🇩🇪' },
  { id: 'it', code: 'Italiano', name: 'Italian', nativeName: 'Italiano', flag: '🇮🇹' }
];

/**
 * Countries and independent currency mappings
 * (Architecture prepared for multi-currency international subscriptions)
 */
export const SUPPORTED_CURRENCIES: CurrencyOption[] = [
  { code: 'EUR', symbol: '€', name: 'Euro' },
  { code: 'USD', symbol: '$', name: 'US Dollar' },
  { code: 'GBP', symbol: '£', name: 'British Pound' },
  { code: 'BRL', symbol: 'R$', name: 'Brazilian Real' },
  { code: 'XOF', symbol: 'CFA', name: 'West African CFA Franc' },
  { code: 'CAD', symbol: 'CA$', name: 'Canadian Dollar' }
];

export const SAMPLE_COUNTRIES: CountryOption[] = [
  { code: 'FR', name: 'France', defaultCurrency: 'EUR', defaultLocale: 'fr' },
  { code: 'US', name: 'United States', defaultCurrency: 'USD', defaultLocale: 'en' },
  { code: 'GB', name: 'United Kingdom', defaultCurrency: 'GBP', defaultLocale: 'en' },
  { code: 'ES', name: 'Spain', defaultCurrency: 'EUR', defaultLocale: 'es' },
  { code: 'PT', name: 'Portugal', defaultCurrency: 'EUR', defaultLocale: 'pt' },
  { code: 'BR', name: 'Brazil', defaultCurrency: 'BRL', defaultLocale: 'pt' },
  { code: 'CA', name: 'Canada', defaultCurrency: 'CAD', defaultLocale: 'en' },
  { code: 'BJ', name: 'Bénin', defaultCurrency: 'XOF', defaultLocale: 'fr' },
  { code: 'SN', name: 'Sénégal', defaultCurrency: 'XOF', defaultLocale: 'fr' },
  { code: 'BE', name: 'Belgique', defaultCurrency: 'EUR', defaultLocale: 'fr' },
  { code: 'CH', name: 'Suisse', defaultCurrency: 'EUR', defaultLocale: 'fr' }
];
