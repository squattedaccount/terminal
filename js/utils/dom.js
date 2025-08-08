/**
 * DOM utility functions
 * 
 * This module provides utility functions for DOM manipulation, including:
 * - Element creation and manipulation
 * - Grid alignment
 * - Scrolling
 * - Animation helpers
 * - Focus management
 */
import logger from '../core/logger.js';

const DOMUtils = {
  /**
   * Focus an element and set cursor at the end of its content
   * @param {HTMLElement} element - Element to focus
   */
  focusAndSetCursorAtEnd(element) {
    if (!element) return;
    
    // Ensure element.textContent is up-to-date if there are mixed child nodes
    if (element.childNodes.length > 1 || (element.childNodes.length === 1 && element.childNodes[0].nodeType !== Node.TEXT_NODE)) {
      element.textContent = element.textContent; // This effectively replaces children with a single text node
    }
    
    element.focus();
    
    const selection = window.getSelection();
    if (selection) {
      const range = document.createRange();
      range.selectNodeContents(element);
      range.collapse(false); // Collapse to end
      selection.removeAllRanges();
      selection.addRange(range);
    }
    
  },

  /**
   * Focus an element and set cursor at the start of its content
   * @param {HTMLElement} element - Element to focus
   */
  focusAndSetCursorAtStart(element) {
    if (!element) {
      logger.error('[DOMUtils] ERROR: focusAndSetCursorAtStart called with null element');
      return;
    }
    
    element.focus();
    
    const selection = window.getSelection();
    if (selection) {
      selection.removeAllRanges(); 
      const range = document.createRange();
      range.selectNodeContents(element); 
      range.collapse(true); // Collapse to the start
      selection.addRange(range);
    }
  },

  /**
   * Scroll an element to the bottom
   * @param {HTMLElement} element - Element to scroll
   */
  scrollToBottom(element) {
    if (!element) return;
    
    const promptLine = element.querySelector('.active-prompt-line');
    if (promptLine) {
      const elementRect = element.getBoundingClientRect();
      const promptRect = promptLine.getBoundingClientRect();
      if (promptRect.bottom > elementRect.bottom) {
        element.scrollTop += (promptRect.bottom - elementRect.bottom) + 40; // 40px buffer
      }
    } else {
      element.scrollTop = element.scrollHeight;
    }
  },

  /**
   * Add spacers at the beginning of the terminal
   * @param {HTMLElement} terminalOutput - Terminal output container
   * @param {number} count - Number of spacers to add
   */
  addInitialSpacers(terminalOutput, count = 2) {
    // Clear existing spacers
    const existingSpacers = terminalOutput.querySelectorAll('.terminal-spacer');
    existingSpacers.forEach(spacer => spacer.remove());
    
    // Add new spacers at the beginning
    for (let i = 0; i < count; i++) {
      const spacer = this.createElement('div', ['terminal-spacer']);
      if (terminalOutput.firstChild) {
        terminalOutput.insertBefore(spacer, terminalOutput.firstChild);
      } else {
        terminalOutput.appendChild(spacer);
      }
    }
  },

  /**
   * Add welcome message to terminal
   * @param {HTMLElement} terminalOutput - Terminal output container
   * @param {string} message - Welcome message HTML
   */
  addWelcomeMessage(terminalOutput, message) {
    // Remove existing welcome message
    const existingWelcome = terminalOutput.querySelector('.welcome-line');
    if (existingWelcome) {
      existingWelcome.remove();
    }
    
    // Create welcome message
    const welcome = this.createElement('div', ['welcome-line', 'terminal-row']);
    welcome.innerHTML = message;
    
    // Add after spacers
    const spacers = terminalOutput.querySelectorAll('.terminal-spacer');
    if (spacers.length > 0) {
      const lastSpacer = spacers[spacers.length - 1];
      if (lastSpacer.nextSibling) {
        terminalOutput.insertBefore(welcome, lastSpacer.nextSibling);
      } else {
        terminalOutput.appendChild(welcome);
      }
    } else {
      if (terminalOutput.firstChild) {
        terminalOutput.insertBefore(welcome, terminalOutput.firstChild);
      } else {
        terminalOutput.appendChild(welcome);
      }
    }
  },

  /**
   * Create an element with optional classes and text content
   * @param {string} tag - HTML tag name
   * @param {string[]} classes - CSS classes to add
   * @param {string} text - Text content
   * @returns {HTMLElement} Created element
   */
  createElement(tag, classes = [], text = '') {
    const element = document.createElement(tag);
    if (classes.length) element.classList.add(...classes);
    if (text) element.textContent = text;
    
    // Apply consistent styling for terminal-related elements
    if (classes.includes('terminal-row') || 
        classes.includes('terminal-spacer') || 
        classes.includes('welcome-line') ||
        classes.includes('prompt-line')) {
      element.style.height = 'var(--terminal-base-row-height)';
      element.style.lineHeight = 'var(--terminal-base-row-height)';
      element.style.margin = '0';
      element.style.padding = '0';
      element.style.boxSizing = 'border-box';
      element.style.display = 'block';
      element.style.width = '100%';
      
      if (classes.includes('terminal-spacer')) {
        // Special styling for spacers
        element.style.height = 'var(--terminal-base-row-height)';
        element.style.minHeight = 'var(--terminal-base-row-height)';
        element.style.maxHeight = 'var(--terminal-base-row-height)';
      }
    }
    
    return element;
  },

  /**
   * Fade in an element
   * @param {HTMLElement} element - Element to fade in
   * @param {number} duration - Duration in milliseconds
   */
  fadeIn(element, duration = 500) {
    element.style.opacity = '0';
    element.style.display = 'block';
    element.style.transition = `opacity ${duration}ms ease`;
    setTimeout(() => { element.style.opacity = '1'; }, 10);
  },

  /**
   * Fade out an element
   * @param {HTMLElement} element - Element to fade out
   * @param {number} duration - Duration in milliseconds
   * @param {Function} callback - Callback after fade out
   */
  fadeOut(element, duration = 500, callback) {
    element.style.transition = `opacity ${duration}ms ease`;
    element.style.opacity = '0';
    setTimeout(() => {
      element.style.display = 'none';
      if (callback) callback();
    }, duration);
  },

  /**
   * Show the theme button
   */
  showThemeButton() {
    const themeButton = document.getElementById('theme-toggle');
    if (themeButton) {
      themeButton.style.display = 'flex';
      setTimeout(() => { themeButton.style.opacity = '1'; }, 10);
    }
  },

  /**
   * Hide the theme button
   */
  hideThemeButton() {
    const themeButton = document.getElementById('theme-toggle');
    if (themeButton) {
      themeButton.style.transition = 'opacity 0.5s ease';
      themeButton.style.opacity = '0';
      setTimeout(() => { themeButton.style.display = 'none'; }, 500);
    }
  }
};

export default DOMUtils;