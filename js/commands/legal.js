import { formatT } from '../utils/command-helpers.js';
import i18n from '../i18n/i18n.js';

export default {
  name: 'legal',
  category: 'info',

  /**
   * Handler for the 'legal' command.
   * Returns a Promise that resolves with the command output.
   */
  async handler() {
    return formatT('commands.legal');
  },

  /**
   * The help text is now a getter to defer i18n calls.
   */
  get help() {
    return {
      summary: i18n.t('help.legal.summary'),
      detailed: i18n.t('help.legal.detailed', { returnObjects: true }),
    };
  },
};
