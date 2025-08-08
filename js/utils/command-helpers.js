import i18n from '../i18n/i18n.js';

/**
 * Fetches a translation and formats it for terminal output.
 * Handles both single string and array translations automatically.
 *
 * @param {string} key - The i18n translation key.
 * @param {string} [type='info'] - The type of output (e.g., 'info', 'header', 'error').
 * @returns {Array<Object>} An array of objects formatted for the terminal.
 */
export function formatT(key, type = 'text') {
  const content = i18n.t(key);

  if (Array.isArray(content)) {
    return content.map(item => ({ type, content: item }));
  }

  // If content is not an array, wrap it in one for consistent output.
  return [{ type, content }];
}
