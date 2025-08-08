/**
 * Input Handler
 * 
 * Handles user input for the terminal, including keyboard events,
 * command submission, and history navigation.
 */

import { eventBus } from '../utils/events.js';
import logger from './logger.js';
import { TERMINAL_EVENTS } from './terminal-events.js';

class InputHandler {
  constructor() {
    // DOM elements
    this.inputElement = null;
    
    // State
    this.initialized = false;
    this.isPasswordMode = false;
    this._actualValue = '';

    // Bound event handlers for proper removal
    this._boundKeyDown = null;
    this._boundInput = null;
    this._boundFocus = null;
    this._boundBlur = null;
    this._boundPaste = null;
  }

  /**
   * Sets the input mode to password or normal text.
   * @param {boolean} enabled - True to enable password mode, false for normal.
   */
  setPasswordMode(enabled) {
    this.isPasswordMode = enabled;
    this._actualValue = ''; // Reset on mode change
    if (this.inputElement) {
      this.inputElement.value = '';
    }
  }



  /**
   * Initialize the input handler with an input element
   * @param {HTMLElement} inputElement - The input element to handle
   * @returns {Object} InputHandler instance
   */
  initialize(inputElement) {
    logger.debug('[InputHandler] Initializing', { hasElement: !!inputElement });
    
    if (!inputElement) {
      logger.error('[InputHandler] No input element provided for initialization');
      return this;
    }

    // If already initialized with a different element, clean up old listeners
    if (this.inputElement && this.inputElement !== inputElement) {
      this._removeEventListeners();
    }

    // Store reference to input element
    this.inputElement = inputElement;
    logger.debug('[InputHandler] Input element set', { tag: this.inputElement.tagName, className: this.inputElement.className });

    // Bind event handlers if not already bound (e.g., first initialization)
    if (!this._boundKeyDown) {
      this._boundKeyDown = this.handleKeyDown.bind(this);
      this._boundInput = () => {
        if (this.inputElement) { // Ensure inputElement is still valid
          eventBus.emit(TERMINAL_EVENTS.CHANGED, this.inputElement.value);
        }
      };
      this._boundFocus = () => eventBus.emit(TERMINAL_EVENTS.FOCUS);
      this._boundBlur = () => eventBus.emit(TERMINAL_EVENTS.BLUR);
      this._boundPaste = this.handlePaste.bind(this);
    }
    
    // Set up event listeners on the new/current element
    this.setupEventListeners();
    
    if (!this.initialized) {
      logger.info('[InputHandler] Initializing for the first time');
      this.initialized = true;
      // Emit general initialization event only once
      eventBus.emit(TERMINAL_EVENTS.INPUT_INITIALIZED, this);
    }
    
    return this;
  }

  /**
   * Set up event listeners for the input handler
   */
  _removeEventListeners() {
    if (this.inputElement) {
      this.inputElement.removeEventListener('keydown', this._boundKeyDown);
      this.inputElement.removeEventListener('input', this._boundInput);
      this.inputElement.removeEventListener('focus', this._boundFocus);
      this.inputElement.removeEventListener('blur', this._boundBlur);
      this.inputElement.removeEventListener('paste', this._boundPaste);
    }
  }

  setupEventListeners() {
    logger.debug('[InputHandler] Setting up event listeners');
    
    if (!this.inputElement) {
      logger.error('[InputHandler] Cannot set up event listeners - no input element available');
      return;
    }
    
    // Event listener management:
    // - _removeEventListeners is called during initialize() when the element changes
    // - This ensures clean state before adding new listeners
    // - No need to call _removeEventListeners here as it's handled by initialize()

    try {
      
      this.inputElement.addEventListener('keydown', this._boundKeyDown);
      
      
      this.inputElement.addEventListener('input', this._boundInput);
      
      
      this.inputElement.addEventListener('focus', this._boundFocus);
      
      
      this.inputElement.addEventListener('blur', this._boundBlur);
      
      
      this.inputElement.addEventListener('paste', this._boundPaste);
      
      logger.debug('[InputHandler] Event listeners attached');
      
      // Test focus to verify event listeners are working
      
      setTimeout(() => {
        try {
          this.inputElement.focus();
          
        } catch (error) {
          logger.error('[InputHandler] Failed to focus input element', error);
        }
      }, 100);
    } catch (error) {
      logger.error('[InputHandler] Failed to attach event listeners', error);
    }
  }

  /**
   * Handle keydown events
   * @param {KeyboardEvent} event - Keyboard event
   */
  handleKeyDown(event) {
    if (event.key === 'Enter' && (event.metaKey || event.ctrlKey)) {
      event.preventDefault();
      logger.debug('SVG regeneration triggered by shortcut.');
      eventBus.emit('terminal:regenerate-svg');
      return;
    }
    // If in password mode, intercept and mask input
    if (this.isPasswordMode) {
      // Only allow Enter to be processed by the switch statement below
      if (event.key !== 'Enter') {
        event.preventDefault(); // Prevent default action for all other keys
      }

      if (event.key === 'Backspace') {
        this._actualValue = this._actualValue.slice(0, -1);
      } else if (event.key.length === 1 && !event.ctrlKey && !event.metaKey) {
        this._actualValue += event.key;
      }
      this.inputElement.value = '*'.repeat(this._actualValue.length);
      // Dispatch an input event to make sure other components (like the cursor) react to the change
      this.inputElement.dispatchEvent(new Event('input'));

      // In password mode, only 'Enter' should fall through to the switch.
      // Other keys are handled above or ignored.
      if (event.key !== 'Enter') {
        return;
      }
    }

    
    switch (event.key) {
      case 'Enter':
        
        this.submitCommand();
        event.preventDefault();
        break;
        
      case 'ArrowUp':
        // Navigate history up
        eventBus.emit(TERMINAL_EVENTS.NAVIGATE, 'up');
        event.preventDefault();
        break;
        
      case 'ArrowDown':
        // Navigate history down
        eventBus.emit(TERMINAL_EVENTS.NAVIGATE, 'down');
        event.preventDefault();
        break;
        
      case 'Tab':
        // Auto-complete (to be implemented)
        event.preventDefault();
        break;
        
      case 'c':
        // Handle Ctrl+C
        if (event.ctrlKey) {
          this.handleCtrlC();
          event.preventDefault();
        }
        break;
        
      case 'l':
        // Handle Ctrl+L (clear terminal)
        if (event.ctrlKey) {
          eventBus.emit(TERMINAL_EVENTS.CLEAR);
          event.preventDefault();
        }
        break;
    }
  }

  /**
   * Submit the current command
   */
  submitCommand() {
    if (!this.inputElement) {
      logger.error('[InputHandler] No input element available for command submission');
      return;
    }
    
    const command = this.getValue().trim();
    
    // Only emit if there's a command
    if (command) {
      logger.debug('[InputHandler] Emitting terminal:input:submit event');
      eventBus.emit('terminal:input:submit', command);
    }

    // After submitting, clear the internal state and the visible input.
    // This is important for both password mode and normal mode, especially on failed attempts.
    this._actualValue = ''; 
    this.inputElement.value = '';
    
    // Notify the view that the input has been cleared so the cursor updates.
    this.inputElement.dispatchEvent(new Event('input'));
  }

  /**
   * Handle Ctrl+C
   */
  handleCtrlC() {
    // Clear the input field
    if (this.inputElement) {
      this.inputElement.value = '';
    }
    
    // Emit cancel event
    eventBus.emit(TERMINAL_EVENTS.CANCEL);
  }

  /**
   * Handle paste events
   * @param {ClipboardEvent} event - Clipboard event
   */
  handlePaste(event) {
    // Allow default paste behavior for now
    // This can be customized if needed
  }

  /**
   * Set the input value
   * @param {string} value - Value to set
   */
  setValue(value) {
    if (this.inputElement) {
      const newValue = value || '';
      this.inputElement.value = newValue;

      // Directly notify CursorManager to synchronize its state and visual display.
      // This is crucial for programmatic changes like history navigation to avoid race conditions
      // with the cursor's blink cycle and its internal 'originalValue'.
      if (window.techno_punks && window.techno_punks.Terminal && window.techno_punks.Terminal.view && 
          window.techno_punks.Terminal.view.cursorManager && 
          typeof window.techno_punks.Terminal.view.cursorManager.syncWithValue === 'function') {
        window.techno_punks.Terminal.view.cursorManager.syncWithValue(newValue);
      } else {
        logger.warn('[InputHandler] CursorManager.syncWithValue not available. Cursor might not update correctly for programmatic changes.');
      }
      
      // Emit general change event for other potential listeners.
      // Note: CursorManager also has its own 'input' event listener on the input element,
      // which will also fire due to 'this.inputElement.value = newValue'. 
      // The syncWithValue call ensures originalValue is correct before that listener might run or blink interval interferes.
      eventBus.emit(TERMINAL_EVENTS.CHANGED, newValue);
    }
  }

  /**
   * Get the current input value
   * @returns {string} Current input value
   */
  getValue() {
    // In password mode, the real value is stored internally.
    // Otherwise, we can just read from the input element.
    if (this.isPasswordMode) {
      return this._actualValue;
    }
    return this.inputElement ? this.inputElement.value : '';
  }

  /**
   * Focus the input element
   */
  focus() {
    if (this.inputElement) {
      this.inputElement.focus();
    }
  }

  /**
   * Clear the input element
   */
  clear() {
    if (this.inputElement) {
      this.inputElement.value = '';
      
      // Emit change event
      eventBus.emit(TERMINAL_EVENTS.CHANGED, '');
    }
  }

  /**
   * Cleanup all event listeners and references
   * Call this when the InputHandler is no longer needed
   */
  cleanup() {
    logger.debug('[InputHandler] Cleaning up event listeners and references');
    
    // Remove all event listeners
    this._removeEventListeners();
    
    // Clear references
    this.inputElement = null;
    this._boundKeyDown = null;
    this._boundInput = null;
    this._boundFocus = null;
    this._boundBlur = null;
    this._boundPaste = null;
    
    // Reset state
    this.initialized = false;
    this.isPasswordMode = false;
    this._actualValue = '';
  }
}

export default InputHandler;
