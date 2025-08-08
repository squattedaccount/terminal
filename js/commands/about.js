import i18n from '../i18n/i18n.js';
import { formatT } from '../utils/command-helpers.js';

export default {
  name: 'about',
  category: 'info',

  /**
   * Handler for the 'about' command.
   * Returns a Promise that resolves with the command output.
   */
  async handler() {
    return formatT('commands.about');
  },

  /**
   * The help text is now a getter to defer i18n calls.
   */
  get help() {
    return {
      summary: i18n.t('help.about.summary'),
      detailed: i18n.t('help.about.detailed', { returnObjects: true }),
    };
  },
};
