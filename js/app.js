import i18n from './i18n/i18n.js';
import { initializeCommands } from './commands/index.js';
import terminal from './core/terminal.js';
import logger from './core/logger.js';
import ThemeManager from './themes/manager.js';
import SimpleMatrixAnimation from './animations/sidebar/simple-matrix.js';
import themeSwitcher from './utils/theme-switcher.js';
import ThemeUtils from './utils/theme.js';
import { initializeMusicPlayer } from './music-player.js';
import mobileAnimation from './utils/mobile-animation.js';

/**
 * The main application controller.
 * This class ensures a deterministic initialization sequence,
 * preventing race conditions.
 */
class App {
  constructor() {
    this.isInitialized = false;
  }

  /**
   * Initializes all application systems in the correct order.
   */
  async init() {
    if (this.isInitialized) {
      logger.warn('Application already initialized.');
      return;
    }

    logger.info('Application initialization sequence started.');

    try {
      // 1. Initialize i18n and wait for it to be ready.
      await i18n.init();
      logger.info('i18n system initialized.');

      // 2. Initialize commands. They can now safely use i18n.
      initializeCommands();
      logger.info('Commands initialized.');

      // 3. Initialize the Terminal UI.
      terminal.initialize();
      logger.info('Terminal UI initialized.');

      // 4. Initialize UI components that depend on the terminal.
      ThemeManager.init();
      ThemeUtils.initThemeSVGUpdates();
      themeSwitcher.init();
      SimpleMatrixAnimation.create();

      // 5. Initialize the Music Player.
      initializeMusicPlayer();
      
      // 6. Initialize mobile animation.
      mobileAnimation.init();
      
      logger.info('UI components initialized.');

      this.isInitialized = true;
      logger.info('Application initialization sequence finished successfully.');

    } catch (error) {
      logger.error('CRITICAL: Application failed to initialize.', error);
      document.body.innerHTML = '<div class="critical-error-message">Critical Application Error. See console for details.</div>';
    }
  }
}

const app = new App();
export default app;
