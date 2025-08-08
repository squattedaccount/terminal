/**
 * Terminal View
 * 
 * Handles rendering and display of the terminal interface.
 */

import { eventBus } from '../utils/events.js';
import { TERMINAL_EVENTS } from './terminal-events.js';
import CursorManager from './cursor_underscore.js';
import terminalCore from './terminal-core.js';
import logger from './logger.js';
import i18n from '../i18n/i18n.js';

class TerminalView {
  constructor() {
    // DOM elements
    this.terminalElement = null;
    this.outputElement = null;
    this.inputElement = null;
    this.promptElement = null;

    // Cursor manager
    this.cursorManager = null;

    // State
    this.initialized = false;
    this.isAttemptingSelection = false; // Flag to track if user is selecting text with mouse

    // Animation delays
    this.CHARACTER_ANIMATION_DELAY_MS = 0;    // Set to 0 for instant line reveal
    this.LINE_ANIMATION_BASE_DELAY_MS = 4; // Drastically reduced for a faster, more authentic feel
    this.LINE_ANIMATION_VARIATION_MS = 2;  // Minimal variation for a rapid cascade effect
    this.MINIMUM_LINE_DELAY_MS = 1;        // Minimum delay to ensure it's not too fast

    // Dispatch table for rendering different output types
    this.outputRenderers = {
      html:      item => this._renderHtml(item),
      text:      item => this._renderText(item),
      command:   item => this.displayCommand(item.content),
      menu:      item => this.displayMenu(item.content),
      error:     item => this.displayError(item.content),
      success:   item => this.displaySuccess(item.content),
      warning:   item => this.displayWarning(item.content),
      svg_block: item => this.displaySvg(item.content),
      clear:     ()   => this.clear(),
      greeting:  item => this.showGreeting(item.content),
      prompt:    item => this.animatePrompt(item.content),
    };
  }

  // --- Helper methods for output ---



  /**
   * Display an interactive menu in the terminal.
   * @param {Object} menuData - The menu data containing title, options, and callback.
   */
  async displayMenu(menuData) {
    if (menuData.title) {
      this._addStaticOutputLine(menuData.title, 'terminal-menu-title');
    }

    const menuContainer = document.createElement('div');
    menuContainer.className = 'terminal-menu';

    menuData.options.forEach(option => {
      const optionElement = document.createElement('a');
      optionElement.href = '#';
      optionElement.className = 'terminal-menu-option';
      optionElement.innerHTML = option.label; // Use innerHTML for emoji flags

      optionElement.addEventListener('click', (e) => {
        e.preventDefault();
        if (menuContainer.classList.contains('disabled')) return;

        menuContainer.classList.add('disabled');
        optionElement.classList.add('selected');

        if (menuData.callback) {
          menuData.callback(option.value);
        }
      });
      menuContainer.appendChild(optionElement);
    });

    this.outputElement.appendChild(menuContainer);
    this.scrollToBottom();
  }

  /**
   * Appends a new line to the terminal output and returns the element.
   * This is useful for dynamic content that needs to be updated in place, like a spinner.
   * @param {string} initialContent - Optional initial content for the line.
   * @param {string} className - Optional CSS class for the line.
   * @returns {HTMLElement} The created line element.
   */
  appendLine(initialContent = '', className = 'terminal-line') {
    const lineElement = document.createElement('div');
    lineElement.className = className;
    lineElement.innerHTML = initialContent; // Use innerHTML to allow simple tags
    this.outputElement.appendChild(lineElement);
    this.scrollToBottom();
    return lineElement;
  }

  /**
   * Updates the content of a specific line element in the terminal.
   * @param {HTMLElement} lineElement - The DOM element of the line to update.
   * @param {string} newContent - The new HTML content for the line.
   */
  updateLine(lineElement, newContent) {
    if (lineElement) {
      lineElement.innerHTML = newContent;
      this.scrollToBottom();
    }
  }

  /**
   * Removes a specific line element from the terminal.
   * @param {HTMLElement} lineElement - The DOM element of the line to remove.
   */
  removeLine(lineElement) {
    if (lineElement && lineElement.parentNode === this.outputElement) {
      this.outputElement.removeChild(lineElement);
    }
  }

  _addStaticOutputLine(content, className = '') {
    const lineContainer = document.createElement('div');
    if (className) {
      lineContainer.className = className;
    }

    if (content instanceof HTMLElement) {
      lineContainer.appendChild(content);
    } else {
      // For strings or other types, use innerHTML to correctly render any HTML tags.
      // This also handles plain text correctly.
      lineContainer.innerHTML = String(content);
    }

    this.outputElement.appendChild(lineContainer);
    this.scrollToBottom();
    return lineContainer;
  }

  async _animateTextOutput(text, baseClassName = '', targetContainer = null) {
    const effectiveCharDelay = this.CHARACTER_ANIMATION_DELAY_MS;
    const outputTarget = this.outputElement; // Always append new lines to the main output element

    if (!outputTarget) {
      logger.error("TerminalView: this.outputElement is not available in _animateTextOutput.");
      return;
    }

    const lines = String(text).split('\n');
    let currentLineElement = targetContainer; // Use targetContainer for the first line if provided

    for (let i = 0; i < lines.length; i++) {
      let lineText = lines[i];

      if (!currentLineElement || i > 0) { // Create new div for subsequent lines or if no initial target
        currentLineElement = document.createElement('div');
        if (baseClassName) {
          currentLineElement.className = baseClassName;
        }
        outputTarget.appendChild(currentLineElement);
      }
      
      if (lineText.length === 0) {
        currentLineElement.innerHTML = '&nbsp;'; // Ensure empty lines take up space
        this.scrollToBottom();
      } else {
        if (currentLineElement.innerHTML === '&nbsp;') { // Clear placeholder if we start typing
            currentLineElement.innerHTML = '';
        }
        
        // Check if line contains [[VPL]] and replace with a link
        if (lineText.includes('[[VPL]]')) {
          const parts = lineText.split('[[VPL]]');
          const link = document.createElement('a');
          link.href = 'https://viralpubliclicense.org/VPL.txt';
          link.target = '_blank';
          link.rel = 'noopener noreferrer';
          link.textContent = 'VPL';
          link.style.textDecoration = 'none';
          link.style.color = 'inherit';
          link.style.cursor = 'pointer';
          
          currentLineElement.textContent = '';
          currentLineElement.appendChild(document.createTextNode(parts[0]));
          currentLineElement.appendChild(link);
          if (parts[1]) {
            currentLineElement.appendChild(document.createTextNode(parts[1]));
          }
        } else if (effectiveCharDelay > 0) {
          for (let j = 0; j < lineText.length; j++) {
            await new Promise(resolve => setTimeout(resolve, effectiveCharDelay));
            currentLineElement.textContent += lineText[j];
            this.scrollToBottom(); // Scroll as text is added
          }
        } else {
          // If char delay is 0, set the whole line content at once
          currentLineElement.textContent = lineText;
          this.scrollToBottom(); // Scroll after line is added
        }
      }

      if (i < lines.length - 1) {
      const randomVariation = (Math.random() * 2 * this.LINE_ANIMATION_VARIATION_MS) - this.LINE_ANIMATION_VARIATION_MS;
      let currentLineDelay = this.LINE_ANIMATION_BASE_DELAY_MS + randomVariation;
      currentLineDelay = Math.max(this.MINIMUM_LINE_DELAY_MS, currentLineDelay); // Ensure minimum delay
      await new Promise(resolve => setTimeout(resolve, currentLineDelay));
      }
    }
  }
  // --- End Helper methods ---

  /**
   * Initialize the terminal view
   * @returns {Object} Terminal view instance
   */
  async initialize() {
    if (this.initialized) {
      logger.debug('Terminal view already initialized');
      return this;
    }

    try {
      logger.debug('Initializing terminal view...');
      
      // Get the terminal container
      this.terminalElement = document.getElementById('terminal');
      if (!this.terminalElement) {
        logger.error('Terminal container not found');
        return this;
      }
      
      // Make sure the terminal is visible
      this.terminalElement.style.display = 'block';
      
      // Clear any existing content
      this.terminalElement.innerHTML = '';
      
      // Create terminal output container
      this.outputElement = document.createElement('div');
      this.outputElement.className = 'terminal-output';
      this.terminalElement.appendChild(this.outputElement);
      
      // Show static password prompt
      // Show the initial greeting using the i18n-powered message
      this.showGreeting(terminalCore.getGreeting());
      // Create input line for user
      this.createInputLine();
      // Focus the input
      this.inputElement.focus();
      
      // Set up event listeners
      this.setupEventListeners();
      
      // Mark as initialized
      this.initialized = true;
      

      
      logger.debug('Terminal view initialized successfully');
      
      // Emit initialization event
      eventBus.emit(TERMINAL_EVENTS.VIEW_INITIALIZED, this);

      // Listen for language changes to refresh the greeting
      eventBus.on('language:changed', () => {
        const rawGreeting = i18n.t('welcome');
        const greeting = rawGreeting.replace(/\[.*?]/, '[help]');
        // Animate transition to new language with rolling effect
        this.fancyUpdateGreeting(greeting);
      });
      
      return this;
    } catch (error) {
      logger.error('Error initializing terminal view:', error);
      alert('Error initializing terminal view: ' + error.message);
      return this;
    }
  }



  /**
   * Create the input line with prompt and input field
   * Only one input line should exist at a time.
   */
  createInputLine() {
    // Remove any existing input line
    const oldInputLine = this.terminalElement.querySelector('.terminal-input-line');
    if (oldInputLine) {
      oldInputLine.remove();
    }

    // Create input line container
    const inputLine = document.createElement('div');
    inputLine.className = 'terminal-input-line';

    // Create prompt
    this.promptElement = document.createElement('span');
    this.promptElement.className = 'terminal-prompt';
    this.promptElement.textContent = terminalCore.getPrompt();
    inputLine.appendChild(this.promptElement);

    // Create a wrapper for the input 
    const inputContainer = document.createElement('div');
    inputContainer.className = 'input-container';

    // Create input field
    this.inputElement = document.createElement('input');
    this.inputElement.className = 'terminal-input';
    this.inputElement.type = 'text';
    this.inputElement.autocomplete = 'off';
    this.inputElement.spellcheck = false;
    inputContainer.appendChild(this.inputElement);

    // Append container to line
    inputLine.appendChild(inputContainer);

    // Clear the input field's value
    this.inputElement.value = '';

    // Initialize the CursorManager (underscore insertion approach)
    this.cursorManager = new CursorManager();
    this.cursorManager.initialize(inputLine, this.inputElement);
    
    this.terminalElement.appendChild(inputLine);
    
    eventBus.emit('terminal:input:element:ready', this.inputElement);
    
    if (this.inputElement) {
      this.inputElement.focus();
    }
  }

  /**
   * Get version information from the DOM
   * @returns {Object} Version information
   */
  getVersionInfo() {
    try {
      const versionElement = document.getElementById('version-display');
      const version = versionElement ? versionElement.textContent.replace('Version: ', '') : 'unknown';

      return {
        text: i18n.t('terminal.version', { version }),
        className: 'terminal-version'
      };
    } catch (error) {
      logger.error('Error getting version info:', error);
      return {
        text: i18n.t('terminal.version', { version: 'unknown' }),
        className: 'terminal-version'
      };
    }
  }

  /**
   * Set up event listeners for the view
   */
  setupEventListeners() {
    // Listen for prompt changes
    eventBus.on(TERMINAL_EVENTS.PROMPT_CHANGED, (prompt) => {
      if (this.promptElement) {
        this.promptElement.textContent = prompt;
      }
    });
    
    // Listen for command output
    eventBus.on(TERMINAL_EVENTS.ADD, (output) => {
      this.displayOutput(output);
    });
    
    // Listen for clear command
    eventBus.on(TERMINAL_EVENTS.CLEAR, () => {
      this.clear();
    });
    
    // Listen for history navigation start (up/down arrow pressed)
    eventBus.on(TERMINAL_EVENTS.NAVIGATE, () => {
      if (this.cursorManager && typeof this.cursorManager.pauseBlinking === 'function') {
        this.cursorManager.pauseBlinking();
      }
    });

    // Listen for history navigation results
    eventBus.on(TERMINAL_EVENTS.ENTRY, (entry) => {
      if (this.inputElement && entry) {
        // Pause blinking before updating value
        if (this.cursorManager && typeof this.cursorManager.pauseBlinking === 'function') {
          this.cursorManager.pauseBlinking();
        }

        // Update the input value
        if (window.techno_punks && window.techno_punks.Terminal && window.techno_punks.Terminal.inputHandler && typeof window.techno_punks.Terminal.inputHandler.setValue === 'function') {
          window.techno_punks.Terminal.inputHandler.setValue(entry.command);
        } else {
          logger.warn('[TerminalView] InputHandler.setValue not available. Setting input value directly.');
          this.inputElement.value = entry.command;
          if (this.cursorManager && typeof this.cursorManager.syncWithValue === 'function') {
            this.cursorManager.syncWithValue(entry.command);
          }
        }

        // Resume blinking after a short delay to ensure all updates are complete
        setTimeout(() => {
          if (this.cursorManager && typeof this.cursorManager.resumeBlinking === 'function') {
            this.cursorManager.resumeBlinking();
          }
        }, 50);
      }
    });

    // --- ROBUST CLICK vs. DRAG-SELECT HANDLING ---
    // This logic reliably distinguishes between a user clicking to focus the input
    // and dragging to select text, preventing the input from stealing focus during selection.
    let mouseDownPos = null;
    const CLICK_THRESHOLD = 5; // Max pixels moved to be considered a click.

    if (this.terminalElement) {
      // 1. On mousedown, record the starting position.
      this.terminalElement.addEventListener('mousedown', (event) => {
        // We only care about the primary mouse button (usually left).
        if (event.button === 0) {
          mouseDownPos = { x: event.clientX, y: event.clientY };
        } else {
          mouseDownPos = null; // Ignore other buttons (right-click, etc.)
        }
      });

      // 2. On click, decide whether to focus based on mouse movement.
      this.terminalElement.addEventListener('click', (event) => {
        // If the user clicked on an interactive element, do nothing.
        if (event.target.tagName === 'A' ||
            event.target.tagName === 'INPUT' ||
            event.target.tagName === 'BUTTON') {
          return;
        }

        // Check if the mouse moved significantly between mousedown and click.
        if (mouseDownPos) {
          const dx = Math.abs(event.clientX - mouseDownPos.x);
          const dy = Math.abs(event.clientY - mouseDownPos.y);

          // If it's a 'true' click (not a drag)...
          if (dx < CLICK_THRESHOLD && dy < CLICK_THRESHOLD) {
            // ...only focus the input if no text selection is active.
            // A double-click creates a selection, so this prevents focus-stealing.
            const selection = window.getSelection();
            if (selection && selection.isCollapsed) {
              this.inputElement.focus({ preventScroll: true });
            }
          }
        }
        // If the mouse moved more, it was a drag-select, so we do nothing.
        
        // Reset for the next click cycle.
        mouseDownPos = null;
      });
    }

  }

  /**
   * Animate the prompt text with overlapping random rolls.
   * @param {string} text - Prompt text to animate
   * @returns {Promise}
   */
  async animatePrompt(text) {
    if (!this.promptElement) return;
    // clear current prompt
    this.promptElement.innerHTML = '';
    // create spans for each character
    const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    const chars = text.split('');
    const spans = chars.map(ch => {
      const span = document.createElement('span');
      span.dataset.final = ch;
      span.textContent = '';
      this.promptElement.appendChild(span);
      return span;
    });
    // animation settings
    const stagger = 80;
    const rollCount = 6;
    const interval = 50;
    // roll each span
    const promises = spans.map((span, idx) => new Promise(resolve => {
      setTimeout(() => {
        let rolls = 0;
        const timer = setInterval(() => {
          if (rolls < rollCount) {
            span.textContent = letters.charAt(Math.floor(Math.random() * letters.length));
            rolls++;
          } else {
            clearInterval(timer);
            span.textContent = span.dataset.final;
            resolve();
          }
        }, interval);
      }, idx * stagger);
    }));
    return Promise.all(promises);
  }

  /**
   * Show greeting message
   * @param {string} greeting - Greeting message
   */
  /**
   * Render the greeting message with rich formatting.
   * The message may contain placeholders like [help] that should be underlined / highlighted.
   * @param {string} greeting - The raw greeting string from i18n.
   */
  showGreeting(greeting) {
    if (!greeting) return;

    // Find or create the greeting container
    let container = this.outputElement.querySelector('.welcome-message');
    if (!container) {
      container = document.createElement('div');
      container.className = 'welcome-message';
      this.outputElement.appendChild(container);
    }

    // Display greeting exactly as provided (including square brackets)
    container.textContent = greeting;

    // Ensure there is a spacer line after the greeting for proper spacing
    let spacer = this.outputElement.querySelector('.welcome-spacer');
    if (!spacer) {
      spacer = document.createElement('div');
      spacer.className = 'welcome-spacer';
      spacer.innerHTML = '&nbsp;';
      this.outputElement.appendChild(spacer);
    }

    this.scrollToBottom();
  }

  /**
   * Display command in the terminal as selectable text (prompt + user input)
   * @param {string} command - Command to display
   */
  displayCommand(command) {
    const oldInputLine = this.terminalElement.querySelector('.terminal-input-line');
    if (oldInputLine) {
      oldInputLine.remove();
    }

    const fullCommandText = terminalCore.getPrompt() + command;
    const loggedCommandSpan = document.createElement('span');
    loggedCommandSpan.className = 'terminal-command terminal-user-input';
    loggedCommandSpan.textContent = fullCommandText;
    
    // Use _addStaticOutputLine for instant display of the command echo.
    // The class 'command-output historical-prompt-line' applies to the line container.
    return this._addStaticOutputLine(loggedCommandSpan, 'command-output historical-prompt-line');
  }

  /**
   * Display output in the terminal.
   * Handles strings, HTML objects, and arrays of mixed content.
   * @param {*} output - The content to display.
   */
  /**
   * Renders a single output item using the dispatch table.
   * @param {Object|string} item - The item to render.
   * @private
   */
  async _renderOutputItem(item) {
    if (typeof item === 'string') {
      // Handle plain strings by treating them as text output
      return this._renderText({ content: item });
    }

    const renderer = this.outputRenderers[item.type];

    if (renderer) {
      await renderer(item);
    } else if (item) {
      // Default to object handler for complex or unknown data types
      this.handleResultObject(item);
    }
  }

  // --- Private Render Helpers ---

  async _renderHtml(item) {
    // This function should NOT animate. It adds a static line of HTML.
    this._addStaticOutputLine(item.content);
  }

  async _renderText(item) {
    // Use the new animator for text to get the line-by-line effect.
    await this._animateLines(item.content, item.className || '');
  }

  /**
   * Pauses for a short, slightly randomized duration to simulate a typewriter effect.
   * @private
   */
  async _animateLines(text, className = '') {
    const lines = String(text).split('\n');
    for (const line of lines) {
      this._addStaticOutputLine(line, className);
      await this._pauseBetweenLines();
    }
  }

  /**
   * Pauses for a short, slightly randomized duration to simulate a typewriter effect.
   * @private
   */
  _pauseBetweenLines() {
    const delay = this.LINE_ANIMATION_BASE_DELAY_MS + (Math.random() * this.LINE_ANIMATION_VARIATION_MS) - (this.LINE_ANIMATION_VARIATION_MS / 2);
    const finalDelay = Math.max(this.MINIMUM_LINE_DELAY_MS, delay);
    return new Promise(resolve => setTimeout(resolve, finalDelay));
  }

  async displayOutput(output) {
    if (!output) {
      this.ensurePromptVisible();
      return;
    }

    try {
      if (Array.isArray(output)) {
        // Handle mixed-content arrays
        for (let i = 0; i < output.length; i++) {
          await this._renderOutputItem(output[i]);

          // Add a delay after each item for the line-by-line effect
          if (i < output.length - 1) {
            const randomVariation = (Math.random() * 2 * this.LINE_ANIMATION_VARIATION_MS) - this.LINE_ANIMATION_VARIATION_MS;
            let lineDelay = this.LINE_ANIMATION_BASE_DELAY_MS + randomVariation;
            lineDelay = Math.max(this.MINIMUM_LINE_DELAY_MS, lineDelay);
            await new Promise(resolve => setTimeout(resolve, lineDelay));
          }
        }
      } else {
        // Fallback for single, non-array results
        await this._renderOutputItem(output);
      }
    } catch (error) {
      logger.error('Error displaying output:', error);
      this._addStaticOutputLine(String(output), 'command-output error');
    } finally {
      this.ensurePromptVisible();
    }
  }

  /**
   * Handle a result object in the display
   * @param {Object} item - The result object to handle
   */
  async handleResultObject(item) {
    if (item.error) {
      await this._animateTextOutput(item.error, 'terminal-error');
    } else if (item.type === 'html' || item.type === 'html_block' || item.html || item.className === 'raw-html-output') {
      // Handle complex HTML content statically
      const htmlContentContainer = document.createElement('div');
      htmlContentContainer.className = item.className || ''; // Use provided class or default
      htmlContentContainer.innerHTML = item.html || item.message || item.content || ''; // Prefer .html or .content
      this.output.appendChild(htmlContentContainer);
      
      // Execute any scripts in the HTML (existing logic)
      const scripts = htmlContentContainer.getElementsByTagName('script');
      Array.from(scripts).forEach(script => {
        const newScript = document.createElement('script');
        if (script.src) {
          newScript.src = script.src;
        } else {
          newScript.textContent = script.textContent;
        }
        // Appending to body and removing might not always be ideal, but it's the existing logic.
        document.body.appendChild(newScript).parentNode.removeChild(newScript);
      });
      this._addStaticOutputLine(htmlContentContainer); // Add the fully formed HTML element statically
    } else if (item.text || item.message) { // General text or message, animate this.
      await this._animateTextOutput(item.text || item.message, item.className || 'command-output');
    } else if (item.type === 'success') {
      await this._animateTextOutput(item.message || item.content || JSON.stringify(item), 'terminal-success');
    } else if (item.type === 'warning') {
      await this._animateTextOutput(item.message || item.content || JSON.stringify(item), 'terminal-warning');
    } else if (item.type === 'svg') {
      this.displaySvg(item.content || item.svg); // SVGs are complex, add statically via existing method
    } else {
      // Default for other objects: stringify and animate as plain text
      await this._animateTextOutput(JSON.stringify(item), 'command-output');
    }
  }

  /**
   * Display SVG content
   * @param {string} svgContent - SVG content to display
   */
  displaySvg(svgContent) {
    if (!svgContent) return;
    
    const container = document.createElement('div');
    container.className = 'terminal-svg-container';
    
    // Create a wrapper to control SVG colors through CSS
    const wrapper = document.createElement('div');
    wrapper.className = 'svg-theme-wrapper';
    wrapper.innerHTML = svgContent;
    
    // Add the wrapper to the container
    container.appendChild(wrapper);
    
    // Add the container to the output
    this.outputElement.appendChild(container);
    this.scrollToBottom();
  }

  /**
   * Ensure the prompt is visible and properly positioned
   */
  ensurePromptVisible() {
    // Force a reflow to ensure the DOM is updated
    this.outputElement.offsetHeight;
    
    // Scroll to the bottom to ensure the prompt is visible
    this.scrollToBottom();
    
    // Focus the input for the next command
    this.inputElement.focus();
  }

  /**
   * Clear the terminal
   */
  clear() {
    // Remove all output lines except greeting and spacer to lock layout
    const children = Array.from(this.outputElement.children);
    children.forEach(child => {
      if (!child.classList.contains('welcome-message') && !child.classList.contains('welcome-spacer')) {
        this.outputElement.removeChild(child);
      }
    });

    // Reset cursor and input line
    if (this.cursorManager) this.cursorManager.show();
    this.createInputLine();
    if (this.inputElement) this.inputElement.focus();
  }

  /**
   * Remove existing greeting and spacer
   */
  removeGreeting() {
    if (this.outputElement) {
      const greetingEl = this.outputElement.querySelector('.welcome-message');
      if (greetingEl) {
        // Hide greeting but preserve its space to avoid layout jump
        greetingEl.style.visibility = 'hidden';
      }
      const spacer = this.outputElement.querySelector('.welcome-spacer');
      if (spacer) spacer.remove();
    }
  }

  /**
   * Update existing greeting in place with new text
   * @param {string} greeting - New greeting message
   */
  updateGreeting(greeting) {
    const greetingEl = this.outputElement.querySelector('.welcome-message');
    if (!greetingEl) return;
    // clear prior text
    greetingEl.innerHTML = '';
    // animate into existing container and then add spacer
    this._animateTextOutput(greeting, '', greetingEl)
      .then(() => {
        const spacer = document.createElement('div');
        spacer.className = 'welcome-spacer';
        greetingEl.parentNode.insertBefore(spacer, greetingEl.nextSibling);
        this.outputElement.offsetHeight; // force reflow
        this.scrollToBottom();
      })
      .catch(error => logger.error('Error updating greeting:', error));
  }

  /**
   * Prepend a greeting message above all existing lines
   * @param {string} greeting - Greeting message
   * @returns {Promise} resolves after animation
   */
  prependGreeting(greeting) {
    if (!this.outputElement) return Promise.resolve();
    // Create container at top
    const greetingContainer = document.createElement('div');
    greetingContainer.className = 'welcome-message';
    this.outputElement.insertBefore(greetingContainer, this.outputElement.firstChild);
    // Animate text into it and add spacer
    return this._animateTextOutput(greeting, '', greetingContainer)
      .then(() => {
        const spacer = document.createElement('div');
        spacer.className = 'welcome-spacer';
        this.outputElement.insertBefore(spacer, greetingContainer.nextSibling);
        this.outputElement.offsetHeight;
        this.scrollToBottom();
      })
      .catch(error => logger.error('Error prepending greeting:', error));
  }

  /**
   * Fancy animate a greeting with overlapping character rolls.
   * @param {string} text - Greeting text to animate
   * @returns {Promise} resolves when animation completes
   */
  fancyAnimateGreeting(text) {
    if (!this.outputElement) return Promise.resolve();
    // Reuse or create greeting container at top
    let container = this.outputElement.querySelector('.welcome-message');
    const firstTimeFA = !container;
    if (firstTimeFA) {
      container = document.createElement('div');
      container.className = 'welcome-message';
      this.outputElement.insertBefore(container, this.outputElement.firstChild);
    } else {
      container.innerHTML = '';
    }
    // Make sure it's visible
    container.style.visibility = 'visible';

    const chars = text.split('');
    const spans = chars.map(ch => {
      const span = document.createElement('span');
      span.dataset.final = ch;
      span.textContent = '';
      container.appendChild(span);
      return span;
    });

    const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    const stagger = 40;  // ms between starts (50% faster)
    const rollCount = 6; // rolls per character
    const interval = 25; // ms per roll (50% faster)

    const promises = spans.map((span, idx) => new Promise(resolve => {
      setTimeout(() => {
        let rolls = 0;
        const timer = setInterval(() => {
          if (rolls < rollCount) {
            span.textContent = letters.charAt(Math.floor(Math.random() * letters.length));
            rolls++;
          } else {
            clearInterval(timer);
            span.textContent = span.dataset.final;
            resolve();
          }
        }, interval);
      }, idx * stagger);
    }));

    return Promise.all(promises)
      .then(() => {
        // Ensure spacer exists
        let spacer = this.outputElement.querySelector('.welcome-spacer');
        if (!spacer) {
          spacer = document.createElement('div');
          spacer.className = 'welcome-spacer';
          this.outputElement.appendChild(spacer);
        }
        // Make sure spacer is visible
        spacer.style.visibility = 'visible';
        this.scrollToBottom();
      })
      .catch(error => logger.error('Error in fancyAnimateGreeting:', error));
  }

  /**
   * Fancy animate an existing greeting message with overlapping character rolls.
   * @param {string} text - Greeting text to animate
   * @returns {Promise}
   */
  async fancyUpdateGreeting(text) {
    const greetingEl = this.outputElement.querySelector('.welcome-message');
    if (!greetingEl) return;
    // clear existing text
    greetingEl.innerHTML = '';
    // create spans for each character
    const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    const fullText = text || 'Welcome to the abyss. Type [help] to interact.';
    const helpStartIndex = fullText.indexOf('[help]') + 1; // start after '['
    const helpEndIndex = helpStartIndex + 'help'.length;

    const chars = fullText.split('');
    const spans = chars.map((ch, index) => {
      const span = document.createElement('span');
      span.dataset.final = ch;
      span.textContent = '';
      if (index >= helpStartIndex && index < helpEndIndex) {
        span.classList.add('bold-text');
      }
      greetingEl.appendChild(span);
      return span;
    });
    const stagger = 26;  // ms between starts (35% faster)
    const rollCount = 6;
    const interval = 16; // ms per roll (35% faster)
    const promises = spans.map((span, idx) => new Promise(resolve => {
      setTimeout(() => {
        let rolls = 0;
        const timer = setInterval(() => {
          if (rolls < rollCount) {
            span.textContent = letters.charAt(Math.floor(Math.random() * letters.length));
            rolls++;
          } else {
            clearInterval(timer);
            span.textContent = span.dataset.final;
            resolve();
          }
        }, interval);
      }, idx * stagger);
    }));
    await Promise.all(promises);
    // Ensure single spacer exists just once
    let spacer = this.outputElement.querySelector('.welcome-spacer');
    if (!spacer) {
      spacer = document.createElement('div');
      spacer.className = 'welcome-spacer';
      greetingEl.parentNode.insertBefore(spacer, greetingEl.nextSibling);
    }
    this.scrollToBottom();
  }

  /**
   * Scroll terminal to bottom
   */
  scrollToBottom() {
    if (this.terminalElement) {
      // Use requestAnimationFrame for smoother scrolling
      requestAnimationFrame(() => {
        this.terminalElement.scrollTo({
          top: this.terminalElement.scrollHeight,
          behavior: 'auto' // Changed from 'smooth' for an instant, authentic terminal scroll
        });
      });
    }
  }

  /**
   * Display error message
   * @param {string} message - Error message
   */
  async displayError(message) { // Method becomes async
    await this._animateTextOutput(message, 'terminal-error');
    // scrollToBottom is handled by _animateTextOutput
  }
  
  /**
   * Display success message
   * @param {string} message - Success message
   */
  async displaySuccess(message) { // Method becomes async
    await this._animateTextOutput(message, 'terminal-success');
    // scrollToBottom is handled by _animateTextOutput
  }
  
  /**
   * Display warning message
   * @param {string} message - Warning message
   */
  async displayWarning(message) { // Method becomes async
    await this._animateTextOutput(message, 'terminal-warning');
    // scrollToBottom is handled by _animateTextOutput
  }
}

// Create singleton instance
const terminalView = new TerminalView();

export default terminalView;
