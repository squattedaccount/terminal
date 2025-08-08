/**
 * Terminal Controller
 * 
 * Handles user input and command execution for the terminal.
 */

import { eventBus } from '../utils/events.js';
import { TERMINAL_EVENTS } from './terminal-events.js';
import commandRegistry from '../commands/registry.js';
import terminalCore from './terminal-core.js';
import terminalView from './terminal-view.js';
import logger from './logger.js';
import i18n from '../i18n/i18n.js';
import Authenticator from './authenticator.js';

class TerminalController {
  constructor() {
    this.commandRegistry = commandRegistry;
    this.authenticator = new Authenticator(this);
    this.terminal = null;
    this.initialized = false;
    this.isAuthenticated = false;
    this.isProcessingCommand = false;
  }

  initialize(terminal) {
    if (this.initialized) {
      logger.debug('Terminal controller already initialized');
      return this;
    }
    this.terminal = terminal;

    logger.debug('Initializing terminal controller...');
    this.setupEventListeners();
    this.initialized = true;
    eventBus.emit(TERMINAL_EVENTS.CONTROLLER_INITIALIZED, this);
    return this;
  }

  setupEventListeners() {
    logger.debug('[TerminalController] Setting up event listeners');
    try {
      if (!eventBus) {
        logger.error('[TerminalController] ERROR: eventBus is undefined or null');
        return;
      }
      eventBus.on('terminal:input:submit', (command) => {
        this.handleCommandSubmission(command);
      });
      eventBus.on(TERMINAL_EVENTS.PROCESS, (command) => {
        this.processCommand(command);
      });
      document.addEventListener('command:execute', (event) => {
        if (event.detail && event.detail.command) {
          this.handleCommandSubmission(event.detail.command);
        }
      });
      document.addEventListener('keydown', (event) => {
        this.handleKeyboardShortcuts(event);
      });
    } catch (error) {
      logger.error('[TerminalController] ERROR: Failed to set up event listeners:', error);
    }
  }

  async handleCommandSubmission(command) {
    if (!command) {
      return;
    }
    try {
      if (!this.isAuthenticated) {
        const commandToDisplay = '*'.repeat(command.length);
        terminalView.displayCommand(commandToDisplay);
        await this.authenticator.authenticate(command);
        return;
      }

      terminalView.displayCommand(command);
      terminalCore.addToHistory(command);
      this.processCommand(command);
    } catch (error) {
      logger.error('[TerminalController] ERROR: Failed to handle command submission', error);
    }
  }

  async processCommand(command) {
    if (!command || this.isProcessingCommand) {
      return;
    }

    this.isProcessingCommand = true;
    try {
      const { commandName, args } = this.parseCommand(command);

      if (await this.handleBuiltInCommand(commandName, args)) {
        return;
      }

      const cmd = this.commandRegistry.getCommand(commandName);
      if (!cmd) {
        const errorText = i18n.t('terminal.error.unknownCommand', { commandName });
        await terminalView.displayError(errorText);
        return;
      }

      const onMessage = (message) => {
        terminalView.displayOutput(message);
      };

      const result = await Promise.resolve(cmd.handler(args, onMessage));
      if (result) {
        // The command handler returns a result. We pass it directly to the view's
        // displayOutput function, which is responsible for iterating over arrays
        // and calling the correct renderer for each item based on its type.
        // The controller's job is done.
        await terminalView.displayOutput(result);
      }
    } catch (error) {
      logger.error('Error processing command:', error);
      await terminalView.displayError(`Error processing command: ${error.message}`);
    } finally {
      this.isProcessingCommand = false;
      if (terminalView) {
        const existingInput = terminalView.terminalElement.querySelector('.terminal-input-line');
        if (!existingInput) {
          terminalView.createInputLine();
        }
      }
    }
  }

  parseCommand(commandString) {
    if (!commandString) {
      return { commandName: '', args: [] };
    }
    const parts = [];
    let current = '';
    let inQuotes = false;
    let quoteChar = '';
    for (let i = 0; i < commandString.length; i++) {
      const char = commandString[i];
      if ((char === '"' || char === "'") && (i === 0 || commandString[i - 1] !== '\\')) {
        if (!inQuotes) {
          inQuotes = true;
          quoteChar = char;
        } else if (char === quoteChar) {
          inQuotes = false;
          quoteChar = '';
        } else {
          current += char;
        }
      } else if (char === ' ' && !inQuotes) {
        if (current) {
          parts.push(current);
          current = '';
        }
      } else {
        current += char;
      }
    }
    if (current) {
      parts.push(current);
    }
    const commandName = parts[0] || '';
    const args = parts.slice(1);
    return { commandName, args };
  }

  async handleBuiltInCommand(commandName, args) {
    switch (commandName.toLowerCase()) {
      case 'clear':
        eventBus.emit(TERMINAL_EVENTS.CLEAR);
        return true;
      case 'version':
        const versionInfo = terminalView.getVersionInfo();
        await terminalView.displayOutput(versionInfo);
        return true;
      default:
        return false;
    }
  }

  handleKeyboardShortcuts(event) {
    if (event.ctrlKey && event.key === 'l') {
      event.preventDefault();
      eventBus.emit('terminal:clear');
    }
  }
}



const terminalController = new TerminalController();

export default terminalController;
