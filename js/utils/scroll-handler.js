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
    // Use native scrolling inside the terminal; only forward when outside
    document.addEventListener('wheel', function(event) {
      if (!terminal) return;
      const inTerminal = isEventInTerminal(event);

      if (inTerminal) {
        // Let the browser handle wheel inside the terminal for smoother behavior
        return;
      } else {
        // If the event is outside, forward scroll to the terminal to keep UX centered there
        const before = terminal.scrollTop;
        terminal.scrollTop = Math.max(0, Math.min(terminal.scrollTop + event.deltaY, terminal.scrollHeight));
        // Prevent default page scroll only if we actually forwarded movement
        if (terminal.scrollTop !== before) {
          event.preventDefault();
        }
      }
      // Allow default scrolling behavior otherwise
    }, { passive: false });
    
    logger.debug('[ScrollHandler] Scroll handling initialized with selection support');
  }
};

export default ScrollHandler;
