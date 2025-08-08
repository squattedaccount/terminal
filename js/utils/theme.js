/**
 * Theme utility functions
 * 
 * Provides theme-related utility functions and forwards to ThemeManager
 */

import SVGUtils from './svg.js';
import ThemeManager from '../themes/manager.js';
import { eventBus } from './events.js';
import logger from '../core/logger.js';

const ThemeUtils = {
  /**
   * Update all theme-dependent SVGs
   */
  updateAllThemeSVGs() {
    const currentThemeName = ThemeManager.getCurrentTheme();
    
    // Get colors from CSS variables (works for all theme types)
    const style = getComputedStyle(document.documentElement);
    const bgColor = style.getPropertyValue('--color-svg-background').trim() || 
                  (currentThemeName === 'dark' ? '#000000' : '#393a96');
    const textColor = style.getPropertyValue('--color-svg-text').trim() || 
                    (currentThemeName === 'dark' ? '#80e3c3' : '#FFB7B2');
                   
    document.querySelectorAll('img.theme-svg').forEach(img => {
      // Use indices if available, else parse pair
      let indices = null;
      if (img.dataset.indices) {
        try {
          indices = JSON.parse(img.dataset.indices);
          if (!Array.isArray(indices)) indices = null;
        } catch (e) {
          logger.warn('Invalid indices data:', img.dataset.indices);
        }
      }
      
      try {
        // Generate new SVG with the correct theme
        const pair = SVGUtils.getRandomCharPair(indices);
        const svg = SVGUtils.generateCircleSVG(pair, { 
          bgColor,
          textColor 
        });
        if (svg) {
          img.src = 'data:image/svg+xml;utf8,' + encodeURIComponent(svg);
        }
      } catch (e) {
        logger.error('Error generating theme SVG:', e);
      }
    });
    
    // Emit event that SVGs have been updated
    eventBus.emit('theme:svgsUpdated');
  },

  /**
   * Initialize event listener for theme changes to update SVGs.
   * This should be called after ThemeManager.init().
   */
  initThemeSVGUpdates() {
    eventBus.on('theme:changed', () => this.updateAllThemeSVGs());
    this.updateAllThemeSVGs(); // Initial update
  }
};

export default ThemeUtils;
