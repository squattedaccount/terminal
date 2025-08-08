/**
 * Theme Manager
 * Handles theme switching and persistence
 */

import { eventBus } from '../utils/events.js';
import logger from '../core/logger.js';

const ThemeManager = {
  // Available themes
  themes: ['dark', 'light', 'custom'],
  
  /**
   * Initialize theme from localStorage or use dark theme as default
   */
  init() {
    const savedTheme = localStorage.getItem('preferredTheme') || 'dark';
    this.setTheme(savedTheme);
    
    // Emit event that theme system is ready
    eventBus.emit('theme:initialized');
    
    // Setup media query listener for system theme changes
    this.setupSystemThemeListener();
  },
  
  /**
   * Setup listener for system theme preference changes
   */
  setupSystemThemeListener() {
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    
    // Initial check
    const systemTheme = mediaQuery.matches ? 'dark' : 'light';
    
    // Don't overwrite user preference, but log the system preference
    logger.debug(`System theme preference: ${systemTheme}`);
    
    // Listen for changes
    const handleChange = (e) => {
      const newSystemTheme = e.matches ? 'dark' : 'light';
      eventBus.emit('theme:systemPreferenceChanged', newSystemTheme);
      
      // If the user hasn't set a preference, follow system
      if (!localStorage.getItem('preferredTheme')) {
        this.setTheme(newSystemTheme);
      }
    };
    
    // Add the listener using the appropriate method
    if (mediaQuery.addEventListener) {
      mediaQuery.addEventListener('change', handleChange);
    } else {
      // Fallback for older browsers
      mediaQuery.addListener(handleChange);
    }
  },
  
  /**
   * Set the current theme
   * @param {string} themeName - Name of the theme to set
   */
  setTheme(themeName) {
    // Validate theme name
    if (!this.themes.includes(themeName)) {
      logger.warn(`Theme '${themeName}' not found. Using 'dark' as fallback.`);
      themeName = 'dark';
    }
    
    // Apply theme by adding the appropriate class to the body
    this.applyThemeStyles(themeName);
    
    // Save preference
    localStorage.setItem('preferredTheme', themeName);
    
    // Emit event for theme change
    eventBus.emit('theme:changed', themeName);
    
    return themeName;
  },

  /**
   * Set a custom theme with specific colors
   * @param {string} backgroundColor - Hex color for background
   * @param {string} textColor - Hex color for text
   */
  setCustomTheme(backgroundColor, textColor) {
    // Validate hex colors
    if (!this.isValidHexColor(backgroundColor) || !this.isValidHexColor(textColor)) {
      throw new Error('Invalid hex color format. Use format: #ffffff');
    }

    // Store custom theme data
    const customTheme = {
      backgroundColor: backgroundColor,
      textColor: textColor,
      timestamp: Date.now()
    };
    
    localStorage.setItem('customTheme', JSON.stringify(customTheme));
    
    // Apply custom theme
    this.applyCustomThemeStyles(customTheme);
    
    // Set current theme to custom
    localStorage.setItem('preferredTheme', 'custom');
    
    // Emit event for theme change
    eventBus.emit('theme:changed', 'custom');
    
    return 'custom';
  },

  /**
   * Validate hex color format
   * @param {string} color - Color to validate
   * @returns {boolean} True if valid hex color
   */
  isValidHexColor(color) {
    return /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/.test(color);
  },

  /**
   * Apply custom theme styles to CSS variables
   * @param {Object} customTheme - Custom theme configuration
   */
  applyCustomThemeStyles(customTheme) {
    const root = document.documentElement;
    
    // Apply custom colors to CSS variables
    root.style.setProperty('--color-background', customTheme.backgroundColor);
    root.style.setProperty('--color-text-primary', customTheme.textColor);
    root.style.setProperty('--color-svg-background', customTheme.backgroundColor);
    root.style.setProperty('--color-svg-text', customTheme.textColor);
    root.style.setProperty('--color-svg-border', customTheme.textColor);
    
    // Remove theme classes and add custom class
    const elements = [document.documentElement, document.body];
    elements.forEach(el => {
      el.classList.remove('dark-theme', 'light-theme');
      el.classList.add('custom-theme');
    });
    
    logger.info(`Applied custom theme: bg=${customTheme.backgroundColor}, text=${customTheme.textColor}`);
  },

  /**
   * Get stored custom theme data
   * @returns {Object|null} Custom theme data or null if not set
   */
  getCustomTheme() {
    const stored = localStorage.getItem('customTheme');
    return stored ? JSON.parse(stored) : null;
  },

  /**
   * Check if custom theme is available
   * @returns {boolean} True if custom theme exists
   */
  hasCustomTheme() {
    return this.getCustomTheme() !== null;
  },
  
  /**
   * Apply theme styles to the document
   * @private
   * @param {string} themeName - Name of the theme to apply
   */
  applyThemeStyles(themeName) {
    if (themeName === 'custom') {
      // Handle custom theme
      const customTheme = this.getCustomTheme();
      if (customTheme) {
        this.applyCustomThemeStyles(customTheme);
      } else {
        // Fallback to dark if no custom theme stored
        logger.warn('Custom theme requested but no custom theme data found. Falling back to dark.');
        this.applyThemeStyles('dark');
      }
      return;
    }

    // Remove any existing theme classes from document elements
    const elements = [document.documentElement, document.body];
    
    elements.forEach(el => {
      // Remove all theme classes
      el.classList.remove('dark-theme', 'light-theme', 'custom-theme');
      
      // Add the new theme class
      el.classList.add(`${themeName}-theme`);
    });

    // Reset any custom CSS variables that might have been set
    const root = document.documentElement;
    root.style.removeProperty('--color-background');
    root.style.removeProperty('--color-text-primary');
    root.style.removeProperty('--color-svg-background');
    root.style.removeProperty('--color-svg-text');
    root.style.removeProperty('--color-svg-border');
    
    // Force a reflow to ensure styles are recalculated
    document.body.offsetHeight;
    
    logger.info(`Applied theme: ${themeName} to document elements`);
  },
  
  /**
   * Toggle between themes in cycle: dark → light → custom → dark (if custom exists)
   */
  toggleTheme() {
    const currentTheme = this.getCurrentTheme();
    const hasCustom = this.hasCustomTheme();
    
    if (!hasCustom) {
      // No custom theme, just toggle between dark and light
      const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
      return this.setTheme(newTheme);
    }
    
    // Three-way toggle: dark → light → custom → dark
    let newTheme;
    switch (currentTheme) {
      case 'dark':
        newTheme = 'light';
        break;
      case 'light':
        newTheme = 'custom';
        break;
      case 'custom':
        newTheme = 'dark';
        break;
      default:
        newTheme = 'dark';
    }
    
    return this.setTheme(newTheme);
  },
  
  /**
   * Get the current theme name
   * @returns {string} Current theme name
   */
  getCurrentTheme() {
    return localStorage.getItem('preferredTheme') || 'dark';
  },
  
  /**
   * Get the current theme configuration
   * @returns {Object} Current theme configuration
   */
  getCurrentThemeData() {
    const themeName = this.getCurrentTheme();
    return this.themes[themeName] || this.themes.dark;
  }
};

export default ThemeManager;