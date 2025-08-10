/**
 * Terminal
 * 
 * Main terminal class that integrates core, view, and controller components.
 * This implements the facade pattern to provide a simple interface to the terminal.
 */

import { eventBus } from '../utils/events.js';
import { TERMINAL_EVENTS } from './terminal-events.js';
import terminalCore from './terminal-core.js';
import terminalView from './terminal-view.js';
import terminalController from './terminal-controller.js';
import InputHandler from './input-handler.js';
import logger from './logger.js';
import { PROMPTS } from '../config.js';

class Terminal {
  constructor() {
    // Component references
    this.core = terminalCore;
    this.view = terminalView;
    this.controller = terminalController;
    
    // Input handler
    this.inputHandler = null;
    
    // State
    this.initialized = false;
    
    // Event cleanup tracking
    this.eventCleanup = [];
  }

  /**
   * Initialize the terminal
   * @returns {Object} Terminal instance
   */
  initialize() {
    if (this.initialized) {
      logger.debug('Terminal already initialized');
      return this;
    }

    logger.debug('Initializing terminal...');
    
    try {
      // Create input handler first so it's available when view needs it
      logger.debug('[Terminal] Creating input handler');
      this.inputHandler = new InputHandler();
      
      // Initialize terminal components
      this.core.initialize();
      // Start unlocked with normal prompt
      this.core.setPrompt(PROMPTS.ANONYMOUS);
      // To re-enable password protection, restore the original lines below:
      // this.core.config.greetings = 'Please enter the password:';
      // this.core.setPrompt(PROMPTS.PASSWORD);
      this.view.initialize(); 
  
      
      // After view init, wait for input element before finishing setup
      const finishInit = () => {
        this.controller.initialize(this);
        this.setupEventListeners();
        this.initialized = true;
        logger.debug('Terminal initialized successfully');
        eventBus.emit(TERMINAL_EVENTS.TERMINAL_INITIALIZED, this);
      };
      
      if (this.view.inputElement) {
        this.inputHandler.initialize(this.view.inputElement);
        finishInit();
      } else {
        eventBus.once('terminal:input:element:ready', (inputEl) => {
          this.inputHandler.initialize(inputEl);
          finishInit();
        });
      }

      // Note: originally, password mode was enabled to mask input until auth:
      // this.inputHandler.setPasswordMode(true);
      // If you uncomment the password prompt above, also enable password mode here
      // right after inputHandler.initialize(...).
      return this;
    } catch (error) {
      logger.error('Error initializing terminal:', error);
      alert('Error initializing terminal: ' + error.message);
      return this;
    }
  }

  /**
   * Set up event listeners for the terminal
   */
  setupEventListeners() {
    // Clean up any existing listeners first
    this.cleanupEventListeners();
    
    // Listen for terminal resize events
    const resizeHandler = () => this.handleResize();
    window.addEventListener('resize', resizeHandler);
    this.eventCleanup.push(() => window.removeEventListener('resize', resizeHandler));
    
    // Listen for terminal events
    const clearCleanup = eventBus.on(TERMINAL_EVENTS.CLEAR, () => {
      this.view.clear();
    });
    this.eventCleanup.push(clearCleanup);
    
    // Listen for input element ready event
    logger.debug('[Terminal] Setting up listener for terminal:input:element:ready event');
    const inputReadyCleanup = eventBus.on('terminal:input:element:ready', (inputElement) => {
      logger.debug('[Terminal] Received terminal:input:element:ready event with input element');
      if (inputElement) {
        logger.debug('[Terminal] Initializing input handler with received input element');
        if (this.inputHandler) {
          this.inputHandler.initialize(inputElement);
        } else {
          logger.error('[Terminal] ERROR: Input handler not available when input element is ready');
        }
      } else {
        logger.error('[Terminal] ERROR: Received terminal:input:element:ready event with null/undefined input element');
      }
    });
    this.eventCleanup.push(inputReadyCleanup);
    
    // Listen for theme changes
    const themeCleanup = eventBus.on('theme:changed', () => {
      // Cursor color is now handled by CSS text color. No manual update needed.
      // if (this.view.cursorManager) {
      //   this.view.cursorManager.updateCursorColor(); // This method no longer exists
      // }
    });
    this.eventCleanup.push(themeCleanup);
    
    // Handle command execution events from UI buttons
    const commandHandler = (event) => {
      if (event.detail && event.detail.command) {
        this.core.executeCommand(event.detail.command);
      }
    };
    document.addEventListener('command:execute', commandHandler);
    this.eventCleanup.push(() => document.removeEventListener('command:execute', commandHandler));
  }

  /**
   * Clean up all event listeners
   */
  cleanupEventListeners() {
    this.eventCleanup.forEach(cleanup => {
      try {
        cleanup();
      } catch (error) {
        logger.warn('[Terminal] Error during event cleanup:', error);
      }
    });
    this.eventCleanup = [];
  }

  /**
   * Handle terminal resize
   */
  handleResize() {
    // Cursor position is now handled by text flow. No manual update needed on resize.
    // if (this.view.cursorManager) {
    //   this.view.cursorManager.updateCursorPosition(); // This method no longer exists
    // }
  }

  /**
   * Update the terminal theme
   * @param {Object} themeOptions - Theme options (no longer needed with CSS variables)
   */
  updateTheme(themeOptions) {
    // No need to manually set styles - CSS variables handle this now
    // Just update the cursor color which may need JavaScript handling
    if (this.view.cursorManager) {
      this.view.cursorManager.updateCursorColor();
    }
  }

  /**
   * Refresh the terminal display
   */
  refresh() {
    // Update cursor position without forcing reflow
    if (this.view.cursorManager) {
      this.view.cursorManager.updateCursorPosition();
    }
  }

  /**
   * Clear the terminal
   */
  clear() {
    eventBus.emit(TERMINAL_EVENTS.CLEAR);
  }

  /**
   * Write output to the terminal
   * @param {*} output - Output to write
   */
  write(output) {
    this.view.displayOutput(output);
  }

  /**
   * Execute a command programmatically
   * @param {string} command - Command to execute
   */
  executeCommand(command) {
    if (!command) return;
    
    // Emit command execution event
    eventBus.emit(TERMINAL_EVENTS.EXECUTE, command);
  }

  /**
   * Set the terminal prompt
   * @param {string} prompt - New prompt text
   */
  setPrompt(prompt) {
    this.core.setPrompt(prompt);
  }

  /**
   * Get the command history
   * @returns {string[]} Command history array
   */
  getCommandHistory() {
    return this.core.getCommandHistory();
  }

  /**
   * Updates the target input element for the InputHandler.
   * @param {HTMLElement} newInputElement - The new input element to target.
   */
  updateInputHandlerTarget(newInputElement) {
    logger.debug('[Terminal] updateInputHandlerTarget called with element:', newInputElement ? 'valid element' : 'null');
    
    if (!newInputElement) {
      logger.error('[Terminal] ERROR: Attempted to update input handler with null/undefined element');
      return;
    }
    
    if (!this.inputHandler) {
      logger.debug('[Terminal] Input handler not yet created, creating now');
      this.inputHandler = new InputHandler();
    }
    
    if (typeof this.inputHandler.initialize === 'function') {
      logger.debug('[Terminal] Initializing input handler with input element');
      this.inputHandler.initialize(newInputElement);
    } else {
      logger.error('[Terminal] ERROR: Input handler has no initialize method');
    }
  }

  /**
   * Cleanup all resources and event listeners
   * Call this when the terminal is being destroyed or reinitialized
   */
  cleanup() {
    logger.debug('[Terminal] Cleaning up terminal resources');
    
    // Clean up event listeners
    this.cleanupEventListeners();
    
    // Clean up input handler
    if (this.inputHandler && typeof this.inputHandler.cleanup === 'function') {
      this.inputHandler.cleanup();
    }
    
    // Reset state
    this.initialized = false;
    this.inputHandler = null;
    
    logger.debug('[Terminal] Terminal cleanup completed');
  }
}

// Create singleton instance
const terminal = new Terminal();

export default terminal;
