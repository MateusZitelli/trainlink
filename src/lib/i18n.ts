import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'
import LanguageDetector from 'i18next-browser-languagedetector'

import translationEN from '../locales/en/translation.json'
import commonEN from '../locales/en/common.json'

const resources = {
  en: {
    translation: translationEN,
    common: commonEN,
  },
}

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources,
    fallbackLng: 'en',
    defaultNS: 'translation',
    ns: ['translation', 'common'],

    detection: {
      order: ['localStorage', 'navigator', 'htmlTag'],
      caches: ['localStorage'],
    },

    interpolation: {
      escapeValue: false, // React already handles escaping
    },
  })

export default i18n
