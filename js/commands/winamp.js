import i18n from '../i18n/i18n.js';
import { createTerminalError } from '../utils/messaging.js';

export default {
  name: 'winamp',
  category: 'other',

  /**
   * Toggles the music player's visibility.
   */
  async handler() {
    const player = window.musicPlayer;

    if (player && typeof player.toggleVisibility === 'function') {
      player.toggleVisibility();
      // A command handler must return an array of output objects.
      return []; // No text output on success
    } else {
      return createTerminalError('terminal.error.noWinamp');
    }
  },

  /**
   * The help text is now a getter to defer i18n calls.
   */
  get help() {
    return {
      summary: i18n.t('help.winamp.summary'),
      detailed: i18n.t('help.winamp.detailed', { returnObjects: true }),
    };
  },
};

