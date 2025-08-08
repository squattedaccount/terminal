/**
 * Simple Cursor Manager (underscore-insertion approach)
 * Ported from legacy project `kkk`.
 * Handles cursor display by inserting/removing an underscore character in the input value.
 */

import { eventBus } from '../utils/events.js';
import { TERMINAL_EVENTS } from './terminal-events.js';
import logger from './logger.js';

class CursorManager {
  constructor() {
    this.inputElement = null;
    this.blinkInterval = null;
    this.cursorChar = '_';
    this.isVisible = true;
    this.originalValue = '';
    this.cursorPosition = 0;
    this.isBlinkingPaused = false;
  }

  /**
   * Initialize the cursor manager
   * @param {HTMLElement} inputLineElement - The input line container (unused but kept for API parity)
   * @param {HTMLInputElement} inputElement - The input element
   */
  initialize(inputLineElement, inputElement) {
    if (!inputElement) {
      logger.error('[CursorManager] Missing required input element');
      return;
    }

    // Clean previous state
    if (this.blinkInterval) {
      clearInterval(this.blinkInterval);
      this.blinkInterval = null;
    }

    this.inputElement = inputElement;

    // Ensure we start with a clean value (no stray cursor chars)
    if (this.inputElement.value.includes(this.cursorChar)) {
      this.inputElement.value = this.inputElement.value.replace(new RegExp(this.cursorChar, 'g'), '');
    }
    this.originalValue = this.inputElement.value;

    this.setupEventListeners();
    this.inputElement.focus();

    // Delay startBlinking slightly to allow DOM ready
    setTimeout(() => this.startBlinking(), 100);
  }

  /** Restore the original text without the cursor char */
  restoreOriginalText() {
    if (!this.inputElement) return;
    const pos = this.cursorPosition;
    this.inputElement.value = this.originalValue;
    this.inputElement.selectionStart = pos;
    this.inputElement.selectionEnd = pos;
  }

  /** Update cursor display */
  updateCursor() {
    if (!this.inputElement) return;
    this.restoreOriginalText();

    const selStart = this.inputElement.selectionStart;
    const selEnd = this.inputElement.selectionEnd;
    const value = this.inputElement.value;
    this.cursorPosition = selStart;

    if (selStart === selEnd) {
      this.originalValue = value;
      if (this.isVisible) {
        const newValue = value.substring(0, selStart) + this.cursorChar + value.substring(selStart);
        this.inputElement.value = newValue;
        this.inputElement.selectionStart = selStart;
        this.inputElement.selectionEnd = selStart;
      }
    }
  }

  /** Blink animation */
  startBlinking() {
    if (this.blinkInterval) clearInterval(this.blinkInterval);

    this.isVisible = true;
    this.updateCursor();
    this.isBlinkingPaused = false;

    this.blinkInterval = setInterval(() => {
      // Skip blink update if blinking is paused
      if (this.isBlinkingPaused) {
        return;
      }

      // If there's a selection, stop the blinking logic for this tick.
      if (this.inputElement && this.inputElement.selectionStart !== this.inputElement.selectionEnd) {
        // Ensure the cursor character is not visible when text is selected.
        this.restoreOriginalText();
        this.isVisible = false; // Prevents cursor from reappearing if selection is cleared.
        return;
      }

      // If no selection, proceed with normal blinking.
      this.isVisible = !this.isVisible;
      if (this.isVisible) {
        this.updateCursor();
      } else {
        this.restoreOriginalText();
      }
    }, 500);
  }

  pauseBlinking() {
    this.isBlinkingPaused = true;
    this.isVisible = true; // Keep cursor visible while paused
    this.updateCursor();
  }

  resumeBlinking() {
    if (this.isBlinkingPaused) {
      this.isBlinkingPaused = false;
      // Force immediate cursor update
      this.isVisible = true;
      this.updateCursor();
    }
  }

  stopBlinking() {
    if (this.blinkInterval) {
      clearInterval(this.blinkInterval);
      this.blinkInterval = null;
    }
    this.restoreOriginalText();
  }

  show() {
    if (this.inputElement) this.inputElement.focus();
    this.isVisible = true;
    this.updateCursor();
    this.startBlinking();
  }

  hide() {
    this.isVisible = false;
    this.restoreOriginalText();
    this.stopBlinking();
  }

  /** Synchronise when value set programmatically */
  syncWithValue(newValue) {
    if (!this.inputElement) return;
    const wasBlinking = !!this.blinkInterval;
    if (wasBlinking) this.stopBlinking();

    this.inputElement.value = newValue;
    this.originalValue = newValue;
    if (this.inputElement.selectionStart > newValue.length) {
      this.inputElement.selectionStart = newValue.length;
      this.inputElement.selectionEnd = newValue.length;
    }
    this.cursorPosition = this.inputElement.selectionStart;
    this.updateCursor();
    if (wasBlinking) this.startBlinking();
  }

  setupEventListeners() {
    if (!this.inputElement) return;

    // input event
    this.inputElement.addEventListener('input', () => {
      this.originalValue = this.inputElement.value;
      this.cursorPosition = this.inputElement.selectionStart;
      this.updateCursor();
    });

    // keydown to allow browser to process key then redraw
    this.inputElement.addEventListener('keydown', (e) => {
      if (e.key !== 'ArrowUp' && e.key !== 'ArrowDown') {
        this.restoreOriginalText();
        setTimeout(() => this.updateCursor(), 0);
      }
    });

    // click
    this.inputElement.addEventListener('click', () => {
      // After a click, the browser will have placed the cursor or created a selection.
      // We only need to intervene to redraw our custom cursor if there's no selection.
      if (this.inputElement.selectionStart === this.inputElement.selectionEnd) {
        this.restoreOriginalText();
        setTimeout(() => {
          this.originalValue = this.inputElement.value;
          this.cursorPosition = this.inputElement.selectionStart;
          this.updateCursor();
        }, 0);
      }
      // If there is a selection, we do nothing and let the browser's native selection remain.
    });

    // focus/blur
    this.inputElement.addEventListener('focus', () => this.show());
    this.inputElement.addEventListener('blur', () => this.hide());

    // external cursor update event
    eventBus.on(TERMINAL_EVENTS.CURSOR_UPDATE, () => this.updateCursor());
  }
}

export default CursorManager;
