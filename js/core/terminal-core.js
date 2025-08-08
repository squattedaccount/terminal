/**
 * Terminal Core
 * 
 * Core functionality for the terminal, handling state management
 * and providing interfaces for other components.
 */

import CONFIG, { PROMPTS } from '../config.js';
import { eventBus } from '../utils/events.js';
import { TERMINAL_EVENTS } from './terminal-events.js';
import logger from './logger.js';
import { standardizeCommandOutput } from '../utils/text-formatter.js';
import i18n from '../i18n/i18n.js';

class TerminalCore {
  constructor() {
    // Core configuration
    this.config = {
            name: 'techno_punks_terminal',
      historySize: 100,
      greetings: i18n.t('terminal.welcome'),
      prompt: PROMPTS.DEFAULT
    };
    
    // Terminal state
    this.commandHistory = [];
    this.historyIndex = -1;
    this.initialized = false;
    
    // Set up event listeners for core functionality
    this.setupEventListeners();
  }

  /**
   * Initialize the terminal core
   */
  initialize() {
    if (this.initialized) {
      logger.info('Terminal core already initialized');
      return this;
    }

    logger.info('Initializing terminal core');
    this.initialized = true;
    
    // Emit initialization event
    eventBus.emit(TERMINAL_EVENTS.CORE_INITIALIZED, this);
    
    return this;
  }

  /**
   * Set up event listeners for core functionality
   */
  setupEventListeners() {
    logger.debug('[TerminalCore] Setting up event listeners');
    
    try {
      // Check if eventBus is available
      if (!eventBus) {
        logger.error('[TerminalCore] ERROR: eventBus is undefined or null');
        return;
      }
      
      // Listen for command execution requests
      logger.debug('[TerminalCore] Registering listener for EXECUTE event:', TERMINAL_EVENTS.EXECUTE);
      eventBus.on(TERMINAL_EVENTS.EXECUTE, (command) => {
        logger.debug('[TerminalCore] EXECUTE event received with command:', command);
        this.executeCommand(command);
      });
      
      // Listen for command history navigation
      logger.debug('[TerminalCore] Registering listener for NAVIGATE event:', TERMINAL_EVENTS.NAVIGATE);
      eventBus.on(TERMINAL_EVENTS.NAVIGATE, (direction) => {
        logger.debug('[TerminalCore] NAVIGATE event received with direction:', direction);
        const historyEntry = this.navigateHistory(direction);
        logger.debug('[TerminalCore] Emitting ENTRY event with history entry:', historyEntry);
        eventBus.emit(TERMINAL_EVENTS.ENTRY, historyEntry);
      });
      
      logger.debug('[TerminalCore] Event listeners set up successfully');
    } catch (error) {
      logger.error('[TerminalCore] ERROR: Failed to set up event listeners:', error);
    }
  }

  /**
   * Execute a command
   * @param {string} command - Command to execute
   */
  executeCommand(command) {
    if (!command) {
      logger.warn('[TerminalCore] Empty command received, ignoring');
      return;
    }
    
    logger.debug('[TerminalCore] Executing command:', command);
    
    try {
      // Add to history
      logger.debug('[TerminalCore] Adding command to history');
      this.addToHistory(command);
      
      // Check if eventBus is available
      if (!eventBus) {
        logger.error('[TerminalCore] ERROR: eventBus is undefined or null');
        return;
      }
      
      // Debug event listeners
      logger.debug('[TerminalCore] DEBUG: Current listeners for PROCESS event:', 
        eventBus._getListeners ? eventBus._getListeners(TERMINAL_EVENTS.PROCESS) : 'eventBus._getListeners not available');
      
      // Emit command processing event
      logger.debug('[TerminalCore] Emitting PROCESS event for command:', command, 'Event name:', TERMINAL_EVENTS.PROCESS);
      eventBus.emit(TERMINAL_EVENTS.PROCESS, command);
      logger.debug('[TerminalCore] PROCESS event emitted successfully');
    } catch (error) {
      logger.error('[TerminalCore] ERROR: Failed to execute command:', error);
    }
  }

  /**
   * Add a command to history
   * @param {string} command - Command to add
   */
  addToHistory(command) {
    if (!command) {
      logger.warn('[TerminalCore] Empty command received for history, ignoring');
      return;
    }
    
    logger.debug('[TerminalCore] Adding command to history:', command);
    
    try {
      // Only add if it's not the same as the most recent command
      if (this.commandHistory.length === 0 || 
          this.commandHistory[0] !== command) {
        logger.debug('[TerminalCore] Command is unique, adding to history');
        this.commandHistory.unshift(command);
        
        // Trim history if it exceeds the maximum size
        if (this.commandHistory.length > this.config.historySize) {
          logger.debug('[TerminalCore] History exceeds max size, trimming');
          this.commandHistory.pop();
        }
      } else {
        logger.debug('[TerminalCore] Command is duplicate of most recent, not adding to history');
      }
      
      // Reset history navigation index
      logger.debug('[TerminalCore] Resetting history navigation index');
      this.historyIndex = -1;
    } catch (error) {
      logger.error('[TerminalCore] ERROR: Failed to add command to history:', error);
    }
  }

  /**
   * Navigate command history
   * @param {string} direction - 'up' or 'down'
   * @returns {Object} History entry information
   */
  navigateHistory(direction) {
    if (this.commandHistory.length === 0) {
      return { command: '', index: -1 };
    }
    
    // Store current index before navigation
    const previousIndex = this.historyIndex;
    
    // Navigate up (older commands)
    if (direction === 'up') {
      if (this.historyIndex < this.commandHistory.length - 1) {
        this.historyIndex++;
      }
    } 
    // Navigate down (newer commands)
    else if (direction === 'down') {
      if (this.historyIndex > -1) {
        this.historyIndex--;
      }
    }
    
    // Get the command at the current index
    let command = '';
    if (this.historyIndex === -1) {
      command = '';
    } else {
      command = this.commandHistory[this.historyIndex];
    }
    
    return { 
      command, 
      index: this.historyIndex,
      previousIndex
    };
  }

  /**
   * Get the current command history
   * @returns {string[]} Command history array
   */
  getCommandHistory() {
    return [...this.commandHistory];
  }

  /**
   * Set the terminal prompt
   * @param {string} prompt - New prompt text
   */
  setPrompt(prompt) {
    this.config.prompt = prompt;
    eventBus.emit(TERMINAL_EVENTS.PROMPT_CHANGED, prompt);
  }

  /**
   * Get the current terminal prompt
   * @returns {string} Current prompt
   */
  getPrompt() {
    return this.config.prompt;
  }

  /**
   * Get terminal greeting message
   * @returns {string} Greeting message
   */
  getGreeting() {
    return this.config.greetings;
  }
}

// Create singleton instance
const terminalCore = new TerminalCore();

export default terminalCore;
