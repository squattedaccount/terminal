/**
 * Terminal Settings Manager
 * 
 * Handles loading, saving, and applying terminal settings
 */

import CONFIG from '../config.js';
import i18n from '../i18n/i18n.js';
import { eventBus } from '../utils/events.js';
import logger from './logger.js';

class SettingsManager {
  constructor() {
    this.initialized = false;
    
    // Listen for settings change events
    eventBus.on('language:changed', (data) => this.handleLanguageChange(data));
    eventBus.on('cursor:style:change', (style) => this.handleCursorStyleChange(style));
  }
  
  /**
   * Initialize settings from localStorage
   */
  async init() {
    if (this.initialized) return;
    
    logger.info('Initializing terminal settings');
    
    // Load language
        const savedLanguage = localStorage.getItem('techno_punks_language');
    if (savedLanguage) {
      try {
        const success = await i18n.setLanguage(savedLanguage);
        if (success) {
          window.currentLanguage = savedLanguage;
          logger.info('Applied saved language', savedLanguage);
        }
      } catch (error) {
        logger.error('Error loading saved language:', error);
      }
    }
    
    // Load cursor style
    const savedCursorStyle = localStorage.getItem('cursorStyle');
    if (savedCursorStyle) {
      CONFIG.cursorStyle = savedCursorStyle;
      logger.info('Applied saved cursor style', savedCursorStyle);
    }
    
    this.initialized = true;
    logger.info('Terminal settings initialized');
    
    // Emit event that settings are initialized
    eventBus.emit('settings:initialized');
  }
  
  /**
   * Handle language change event
   * @param {Object} data - Language change data
   */
  handleLanguageChange(data) {
    logger.debug('Language changed', data);
    // No additional handling needed as the language command already saves to localStorage
  }
  
  /**
   * Handle cursor style change event
   * @param {string} style - Cursor style
   */
  handleCursorStyleChange(style) {
    logger.debug('Cursor style changed', style);
    // No additional handling needed as the cursor command already saves to localStorage
  }
}

export default new SettingsManager();
