import i18n from '../i18n/i18n.js';
import logger from '../core/logger.js';
import { eventBus } from '../utils/events.js';
import { createRawTerminalError } from '../utils/messaging.js';

export default {
  name: 'lang',
  category: 'core',

  async handler(args) {
    const langCode = args[0];

    if (!langCode) {
      const currentLanguage = localStorage.getItem('techno_punks_language') || 'en';
      const message = `${i18n.t('currentLanguage')} ${currentLanguage}`;
      return [{ type: 'text', content: message }];
    }

    return this._setLanguage(langCode);
  },

  async _setLanguage(langCode) {
    try {
      const success = await i18n.setLanguage(langCode);
      if (success) {
        window.currentLanguage = langCode;
        localStorage.setItem('techno_punks_language', langCode);
        eventBus.emit('language:changed', { language: langCode });
        return [{ type: 'text', content: i18n.t('languageChanged', { langCode }) }];
      }
      const errorMessage = `${i18n.t('help.lang.error.invalidCode')} ${i18n.t('help.lang.error.suggestion')}`;
      return createRawTerminalError(errorMessage);
    } catch (error) {
      logger.error('Error setting language', error);
      const errorMessage = `${i18n.t('help.lang.error.invalidCode')} ${i18n.t('help.lang.error.suggestion')}`;
      return createRawTerminalError(errorMessage);
    }
  },

  get help() {
    return {
      summary: i18n.t('help.lang.summary'),
      detailed: i18n.t('help.lang.detailed'),
      error: {
        invalidCode: i18n.t('help.lang.error.invalidCode'),
        suggestion: i18n.t('help.lang.error.suggestion'),
      },
    };
  },
};
