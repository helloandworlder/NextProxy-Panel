import { useTranslation } from 'react-i18next';
import { useCallback } from 'react';
import { changeLanguage, supportedLanguages, type SupportedLanguage } from '../locales';

export function useI18n() {
  const { t, i18n } = useTranslation();

  const currentLanguage = i18n.language as SupportedLanguage;

  const setLanguage = useCallback((lang: SupportedLanguage) => {
    changeLanguage(lang);
  }, []);

  return {
    t,
    i18n,
    currentLanguage,
    setLanguage,
    supportedLanguages,
  };
}
