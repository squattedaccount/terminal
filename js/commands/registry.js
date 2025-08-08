/**
 * Command Registry
 * 
 * Centralized registry for all terminal commands with enhanced error handling
 * and organization capabilities.
 */

// Import TextFormatter early to avoid circular dependencies
import TextFormatter from '../utils/text-formatter.js';

import logger from '../core/logger.js';

class CommandRegistry {
  constructor() {
    this.commands = {};
    this.commandCategories = {
      'core': [],
      'info': [],
      'tools': [],
      'web3': [],
      'media': [],
      'other': []
    };
  }

  /**
   * Register a new command from a command object.
   * @param {object} command - The command object to register.
   */
  register(command) {
    const { name, handler, help, category = 'other', hidden = false } = command;

    if (!name || typeof name !== 'string' || !handler || typeof handler !== 'function') {
      logger.error('[CommandRegistry] Invalid command object:', command);
      return;
    }

    const normalizedName = name.toLowerCase().trim();
    this.commands[normalizedName] = command;

    if (!hidden) {
      if (!this.commandCategories[category]) {
        this.commandCategories[category] = [];
      }
      this.commandCategories[category].push(normalizedName);
    }
  }
  
  /**
   * Get a command handler by name
   * @param {string} name - Command name
   * @returns {Function|null} Command handler or null if not found
   */
  getCommand(name) {
    if (!name) return null;
    
    const normalizedName = name.toLowerCase().trim();
    return this.commands[normalizedName] || null;
  }
  
  /**
   * Match a hidden command
   * @param {string} input - Command input
   * @returns {Object|null} { handler, input } or null if no match
   */
  matchHiddenCommand(input) {
    if (!input) return null;
    
    const normalizedInput = input.toLowerCase().trim();
    
    for (const key in this.hiddenCommands) {
      if (normalizedInput.startsWith(key)) {
        return {
          handler: this.hiddenCommands[key],
          input: input
        };
      }
    }
    
    return null;
  }
  
  /**
   * Get all registered command names
   * @returns {string[]} Array of command names
   */
  getAllCommandNames() {
    return Object.keys(this.commands).sort();
  }
  
  /**
   * Get commands by category
   * @param {string} category - Category name
   * @returns {string[]} Array of command names in that category
   */
  getCommandsByCategory(category) {
    return this.commandCategories[category] || [];
  }
  
  /**
   * Get all categories
   * @returns {string[]} Array of category names
   */
  getAllCategories() {
    return Object.keys(this.commandCategories);
  }
  
  /**
   * Get help text for a command
   * @param {string} command - Command name
   * @returns {Object|null} Help text object or null if not found
   */
  getHelpText(commandName) {
    const command = this.getCommand(commandName);

    if (!command) {
      return null;
    }

    // Handle both direct help objects and getter-based help
    if (typeof command.help === 'function') {
      // It's a getter, call it to get the help object
      return command.help();
    } else if (typeof command.help === 'object' && command.help !== null) {
      // It's a plain object
      return command.help;
    }

    return null; // No help available
  }
  
  /**
   * Unregister a command
   * @param {string} name - Command name to unregister
   */
  unregister(name) {
    if (!name) return;
    
    const normalizedName = name.toLowerCase().trim();
    
    // Remove from commands
    delete this.commands[normalizedName];
    
    // Remove from hidden commands
    delete this.hiddenCommands[normalizedName];
    
    // Remove from categories
    Object.keys(this.commandCategories).forEach(category => {
      const index = this.commandCategories[category].indexOf(normalizedName);
      if (index !== -1) {
        this.commandCategories[category].splice(index, 1);
      }
    });
    
    // Remove help text
    delete this.helpTexts[normalizedName];
  }
}

// Create singleton instance
const instance = new CommandRegistry();

// Export singleton instance
export default instance;