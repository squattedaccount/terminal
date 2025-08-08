import { PROMPTS } from '../config.js';
import i18n from '../i18n/i18n.js';

export default class Authenticator {
  constructor(controller) {
    this.controller = controller;
    this.PASSWORD = 'unknown'; // hard-coded gimmick
  }

  /**
   * Authenticate the user
   * @param {string} password - Password to check
   */
  async authenticate(password) {
    const trimmed = password.trim();
    const view = this.controller.terminal.view;
    const core = this.controller.terminal.core;

    if (trimmed === this.PASSWORD) {
      this.controller.isAuthenticated = true;

      const greetingEl = view.outputElement.querySelector('.welcome-message');
      if (greetingEl) greetingEl.style.visibility = 'hidden';
      const oldSpacer = view.outputElement.querySelector('.welcome-spacer');
      if (oldSpacer) oldSpacer.style.visibility = 'hidden';

      const rawGreeting = i18n.t('welcome');
      core.config.greetings = rawGreeting.replace(/\[.*?]/, '[help]');
      await view.fancyAnimateGreeting(core.getGreeting());
      await view.displaySuccess('Terminal unlocked.');

      this.controller.terminal.inputHandler.setPasswordMode(false);
      core.setPrompt(PROMPTS.ANONYMOUS);
      view.createInputLine();
      return true;
    } else {
      await view.displayError('Incorrect password, try again.');
      this.controller.terminal.inputHandler.setPasswordMode(true);
      view.createInputLine();
      return false;
    }
  }
}
