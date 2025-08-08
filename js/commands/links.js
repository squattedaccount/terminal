import { formatT } from '../utils/command-helpers.js';
import i18n from '../i18n/i18n.js';
import logger from '../core/logger.js';

export default {
  name: 'links',
  category: 'info',

  /**
   * Handler for the 'links' command.
   * It's async to implicitly return a Promise.
   */
  async handler() {
    return formatT('commands.links');
  },

  /**
   * The help text is now a getter to defer i18n calls.
   */
  get help() {
    return {
      summary: i18n.t('help.links.summary'),
      detailed: i18n.t('help.links.detailed', { returnObjects: true }),
    };
  },
};
