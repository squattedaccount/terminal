import SVGUtils from '../utils/svg.js';
import { formatT } from '../utils/command-helpers.js';
import i18n from '../i18n/i18n.js';
import logger from '../core/logger.js';
import { eventBus } from '../utils/events.js';

// All JavaScript color management has been removed. The SVGs are now styled
// directly by the browser using CSS variables from `variables.css`.

function cleanupPreviousCollectionElements() {
  logger.debug('[COLLECTION] Cleaning up previous collection elements');
  setTimeout(() => {
    try {
      const orphanedContainers = document.querySelectorAll('.collection-svg-container[style*="position: absolute"]');
      if (orphanedContainers.length > 0) {
        orphanedContainers.forEach(container => container.remove());
      }
    } catch (error) {
      logger.error('Error during collection cleanup:', error);
    }
  }, 0);
}

// Listen for SVG regeneration requests from shortcut
// Global listener to regenerate all SVGs (shortcut)
eventBus.on('terminal:regenerate-svg', () => {
  // Select both legacy and new SVG wrapper classes
  const svgWrappers = document.querySelectorAll('.project-svg-wrapper, .collection-card');
  if (svgWrappers.length > 0) {
    svgWrappers.forEach(wrapper => {
      try {
        const newCharPair = SVGUtils.getRandomCharPair();
        // Regenerate the SVG; colors are handled by CSS.
        const newSvg = SVGUtils.generateCircleSVG(newCharPair);
        wrapper.innerHTML = newSvg;
      } catch (error) {
        console.error('Error regenerating SVG on shortcut:', error);
      }
    });
  }
});

// One-time click listener for per-SVG regeneration within the collection command.
if (!window.__collectionClickListenerAdded) {
  document.addEventListener('click', event => {
    // Look for the nearest SVG wrapper/card within the collection output
    const card = event.target.closest('.collection-card, .project-svg-wrapper');
    if (!card) return; // Ignore clicks outside our cards

    try {
      const newChars = SVGUtils.getRandomCharPair();
      const newSvg = SVGUtils.generateCircleSVG(newChars);
      card.innerHTML = newSvg; // Swap only the clicked SVG
    } catch (err) {
      console.error('[COLLECTION] Error regenerating clicked SVG:', err);
    }
  });
  window.__collectionClickListenerAdded = true;
}

export default {
  name: 'collection',
  category: 'info',

  async handler() {
    cleanupPreviousCollectionElements();

    // Generate two SVGs upfront that will replace placeholders in the translation block.
    const charPair1 = SVGUtils.getRandomCharPair();
    const charPair2 = SVGUtils.getRandomCharPair();
    const svg1 = SVGUtils.generateCircleSVG(charPair1);
    const svg2 = SVGUtils.generateCircleSVG(charPair2);

    // Get raw translation array (strings + potential objects)
    const rawContent = i18n.t('commands.collection');

    // Build final output array, respecting ordering from translation.
    const finalOutput = rawContent.map(item => {
      if (typeof item === 'string') {
        // Plain text line
        return { type: 'text', content: item };
      }

      // Handle special SVG block object
      if (item && item.type === 'svg_block') {
        const htmlWithSvgs = item.html
          .replace('{{SVG_PLACEHOLDER_1}}', svg1)
          .replace('{{SVG_PLACEHOLDER_2}}', svg2);
        return { type: 'html', content: htmlWithSvgs };
      }

      // Fallback: stringify any unknown object safely
      return { type: 'text', content: String(item) };
    });

    return finalOutput;
  },

  get help() {
    return {
      summary: i18n.t('help.collection.summary'),
      detailed: i18n.t('help.collection.detailed', { returnObjects: true }),
    };
  },
};
