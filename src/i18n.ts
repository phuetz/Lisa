import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

import en from './locales/en/common.json';
import fr from './locales/fr/common.json';

// Detect language (very simple – browsers reporting fr* -> fr, else en)
const lng = navigator.language.startsWith('fr') ? 'fr' : 'en';

i18n
  .use(initReactI18next)
  .init({
    resources: {
      en: { translation: en },
      fr: { translation: fr },
    },
    lng,
    fallbackLng: 'en',
    interpolation: { escapeValue: false },
  });

export default i18n;
