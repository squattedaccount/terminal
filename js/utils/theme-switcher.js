/**
 * Theme Switcher
 * A clean implementation for switching between light and dark themes
 * with proper support for our custom terminal implementation
 */

import ThemeManager from '../themes/manager.js';
import { eventBus } from './events.js';
import logger from '../core/logger.js';

class ThemeSwitcher {
  constructor() {
    this.initialized = false;
    this.terminalInstance = null;
  }

  /**
   * Initialize the theme switcher
   */
  init() {
    if (this.initialized) return;
    
    // Set up event listeners
    this.setupEventListeners();
    
    // Initialize with the current theme
    this.applyCurrentTheme();
    
    this.initialized = true;
    logger.debug('[ThemeSwitcher] Initialized');
  }

  /**
   * Set up event listeners for theme switching
   */
  setupEventListeners() {
    // Listen for theme toggle button clicks
    const themeToggle = document.getElementById('theme-toggle');
    if (themeToggle) {
      themeToggle.addEventListener('click', () => this.toggleTheme());
    }

    const mobileLogo = document.getElementById('mobile-logo');
    if (mobileLogo) {
      mobileLogo.addEventListener('click', () => this.toggleTheme());
    }
    
    // Listen for terminal creation to store the instance
    eventBus.on('terminal:created', (terminal) => {
      this.terminalInstance = terminal;
      this.applyThemeToTerminal(ThemeManager.getCurrentTheme());
    });
    
    // Listen for theme changes from other sources
    eventBus.on('theme:changed', (themeName) => {
      this.applyThemeToTerminal(themeName);
    });
  }

  /**
   * Toggle between themes (dark → light → custom → dark)
   */
  toggleTheme() {
    const newTheme = ThemeManager.toggleTheme();
    logger.debug(`[ThemeSwitcher] Toggled theme to: ${newTheme}`);
  }

  /**
   * Apply the current theme from ThemeManager
   */
  applyCurrentTheme() {
    const themeName = ThemeManager.getCurrentTheme();
    this.applyThemeToTerminal(themeName);
  }

  /**
   * Apply a theme to the terminal instance by refreshing it.
   * This is called when the theme changes to ensure the terminal view
   * correctly re-renders with the new theme's CSS variables.
   * @param {string} themeName - The name of the theme being applied
   */
  applyThemeToTerminal(themeName) {
    if (!this.terminalInstance) {
      logger.debug('[ThemeSwitcher] Terminal instance not available yet for theme apply.');
      return;
    }

    // The theme styles are applied to the body by ThemeManager.
    // We just need to refresh the terminal so it can re-calculate its layout
    // and re-render with the new CSS variables.
    if (this.terminalInstance.refresh) {
      this.terminalInstance.refresh();
      logger.debug(`[ThemeSwitcher] Refreshed terminal to apply theme: ${themeName}`);
    }
  }
}

// Create and export singleton instance
const themeSwitcher = new ThemeSwitcher();
export default themeSwitcher;
