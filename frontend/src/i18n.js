import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import enTranslation from './locales/en/translation.json';
import jaTranslation from './locales/ja/translation.json';

// Get saved language preference or default to English
const savedLanguage = localStorage.getItem('preferredLanguage') || 'en';

i18n
  .use(initReactI18next)
  .init({
    resources: {
      en: {
        translation: enTranslation
      },
      ja: {
        translation: jaTranslation
      }
    },
    lng: savedLanguage, // Default language
    fallbackLng: 'en', // Fallback to English if translation missing
    interpolation: {
      escapeValue: false // React already escapes values
    }
  });

export default i18n;
