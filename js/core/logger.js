// Lightweight logging utility for techno_punks Terminal
// Allows enabling/disabling of debug-level logs globally via CONFIG.debug flag or window.__DEBUG__
// Usage:
//   import logger from './logger.js';
//   logger.debug('Only shows when debug enabled');
//   logger.info('Always visible');
//   logger.error('Always visible, alias of console.error');

import CONFIG from '../config.js';

// Determine if debug logging is enabled
function isDebugEnabled() {
  // Priority: explicit global override > config flag > environment variable
  if (typeof window !== 'undefined' && typeof window.__DEBUG__ === 'boolean') {
    return window.__DEBUG__;
  }
  if (typeof CONFIG !== 'undefined' && typeof CONFIG.debug === 'boolean') {
    return CONFIG.debug;
  }
  // Fallback: check NODE_ENV (when bundled with rollup/webpack this may get inlined)
  if (typeof process !== 'undefined' && process.env && process.env.NODE_ENV) {
    return process.env.NODE_ENV !== 'production';
  }
  return false;
}

// Basic formatter to keep logs consistent
function format(prefix, args) {
  // eslint-disable-next-line prefer-spread
  return [`[%c${prefix}%c]`, 'color: #03A9F4; font-weight:bold;', 'color:inherit;', ...args];
}

const logger = {
  debug: (...args) => {
    if (isDebugEnabled()) {
      // eslint-disable-next-line no-console
      console.debug.apply(console, format('DEBUG', args));
    }
  },
  info: (...args) => {
    // eslint-disable-next-line no-console
    console.info.apply(console, format('INFO', args));
  },
  warn: (...args) => {
    // eslint-disable-next-line no-console
    console.warn.apply(console, format('WARN', args));
  },
  error: (...args) => {
    // eslint-disable-next-line no-console
    console.error.apply(console, format('ERROR', args));
  },
};

export default logger;
