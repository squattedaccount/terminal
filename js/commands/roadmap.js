import { formatT } from '../utils/command-helpers.js';
import i18n from '../i18n/i18n.js';

export default {
  name: 'roadmap',
  category: 'info',

  /**
   * Handler for the 'roadmap' command.
   * Returns a Promise that resolves with the command output.
   */
  async handler() {
    return formatT('commands.roadmap');
  },

  /**
   * The help text is now a getter to defer i18n calls.
   */
  get help() {
    return {
      summary: i18n.t('help.roadmap.summary'),
      detailed: i18n.t('help.roadmap.detailed', { returnObjects: true }),
    };
  },
};
