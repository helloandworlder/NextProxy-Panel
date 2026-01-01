import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import enUS from './en-US.json';
import zhCN from './zh-CN.json';

// Get saved language or detect from browser
const getDefaultLanguage = (): string => {
  const saved = localStorage.getItem('panel-language');
  if (saved && ['en-US', 'zh-CN'].includes(saved)) {
    return saved;
  }
  // Detect from browser
  const browserLang = navigator.language;
  if (browserLang.startsWith('zh')) {
    return 'zh-CN';
  }
  return 'en-US';
};

export const supportedLanguages = [
  { code: 'en-US', name: 'English', nativeName: 'English' },
  { code: 'zh-CN', name: 'Chinese (Simplified)', nativeName: '简体中文' },
] as const;

export type SupportedLanguage = (typeof supportedLanguages)[number]['code'];

i18n.use(initReactI18next).init({
  resources: {
    'en-US': { translation: enUS },
    'zh-CN': { translation: zhCN },
  },
  lng: getDefaultLanguage(),
  fallbackLng: 'en-US',
  interpolation: {
    escapeValue: false, // React already escapes
  },
  react: {
    useSuspense: false,
  },
});

// Save language preference
export const changeLanguage = (lang: SupportedLanguage) => {
  localStorage.setItem('panel-language', lang);
  i18n.changeLanguage(lang);
};

export default i18n;
