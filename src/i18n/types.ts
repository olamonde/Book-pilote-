export type SupportedLocale = 'fr' | 'en' | 'es' | 'pt';

export type FallbackLocale = 'en';

export interface LanguageMeta {
  code: SupportedLocale;
  name: string;
  nativeName: string;
  flag: string;
  direction?: 'ltr' | 'rtl';
}

export interface ContentLanguageOption {
  id: string;
  code: string;
  name: string;
  nativeName: string;
  flag: string;
}

export interface CountryOption {
  code: string;
  name: string;
  defaultCurrency: string;
  defaultLocale: SupportedLocale;
}

export interface CurrencyOption {
  code: string;
  symbol: string;
  name: string;
}

export interface TranslationDictionary {
  [key: string]: string | TranslationDictionary;
}
