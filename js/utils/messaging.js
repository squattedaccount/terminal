/**
 * Messaging Utilities
 * 
 * Provides helper functions for creating standardized terminal output objects.
 * This centralizes message formatting, making the codebase cleaner and easier to maintain.
 */
import i18n from '../i18n/i18n.js';

/**
 * Creates a standard terminal message object.
 * @param {string} key - The i18n key for the message content.
 * @param {Object} [vars] - Optional variables for interpolation.
 * @returns {Array<Object>} An array containing a single message object for the terminal.
 */
export function createTerminalMessage(key, vars) {
  return [{ type: 'text', content: i18n.t(key, vars) }];
}

/**
 * Creates a standard terminal error message object.
 * @param {string} key - The i18n key for the error message content.
 * @param {Object} [vars] - Optional variables for interpolation.
 * @returns {Array<Object>} An array containing a single error message object.
 */
/**
 * Creates a standard terminal error message object from a raw string, without translation.
 * @param {string} message - The raw error message to display.
 * @returns {Array<Object>} An array containing a single error message object.
 */
export function createRawTerminalError(message) {
  return [{ type: 'error', content: message }];
}

export function createTerminalError(key, vars) {
  return [{ type: 'error', content: i18n.t(key, vars) }];
}
