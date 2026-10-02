import { SupportedLocale } from '../types';
import { fr } from './fr';
import { en } from './en';
import { es } from './es';
import { pt } from './pt';

export const translations: Record<SupportedLocale, any> = {
  fr,
  en,
  es,
  pt
};

export { fr, en, es, pt };
