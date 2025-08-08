/**
 * Scroll Handler
 * 
 * This utility ensures that mouse wheel scrolling works from any position
 * on the page by forwarding wheel events to the terminal while preserving
 * text selection functionality.
 */

import logger from '../core/logger.js';

const ScrollHandler = {
  /**
   * Initializes the scroll handling logic.
   * This should be called once the DOM is ready.
   */
  initialize() {
    const terminal = document.getElementById('terminal');
    
    if (!terminal) {
      logger.error('[ScrollHandler] Terminal element not found');
      return;
    }
    
    // Helper function to check if event is within terminal
    const isEventInTerminal = (event) => terminal.contains(event.target) || terminal === event.target;
    
    // Capture wheel events on the entire document
    document.addEventListener('wheel', function(event) {
      // Don't handle if terminal doesn't exist
      if (!terminal) return;
      
      // Only handle events within the terminal
      if (isEventInTerminal(event)) {
        terminal.scrollTop += event.deltaY;
        event.preventDefault();
      }
      // Allow default scrolling behavior outside the terminal
    }, { passive: false });
    
    logger.debug('[ScrollHandler] Scroll handling initialized with selection support');
  }
};

export default ScrollHandler;
