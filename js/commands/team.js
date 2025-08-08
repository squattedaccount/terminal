import { formatT } from '../utils/command-helpers.js';
import i18n from '../i18n/i18n.js';
import logger from '../core/logger.js';

export default {
  name: 'team',
  category: 'info',

  /**
   * Handler for the 'team' command.
   * It's async to implicitly return a Promise.
   */
  async handler() {
    return formatT('commands.team');
  },

  /**
   * The help text is now a getter to defer i18n calls.
   */
  get help() {
    return {
      summary: i18n.t('help.team.summary'),
      detailed: i18n.t('help.team.detailed', { returnObjects: true }),
    };
  },
};
