/**
 * Terminal Configuration
 * 
 * Central configuration object for the techno_punks Terminal application.
 * Contains version information, user settings, and available commands.
 */

// Default configuration
const CONFIG = {
    version: 'v0.8.1',
    username: 'anonymous',
        hostname: 'techno_punks',
    availableCommands: [
        'about', 'project', 'minting', 'roadmap',
        'team', 'links', 'legal',
        'language', 'cursor'
    ],
    cursorStyle: 'underscore', // Default cursor style
    debug: false // Global debug flag; set to true to enable verbose logging
};

// --- Prompt Formatting ---
const formatPrompt = (username) => `> ${username}: `;

export const PROMPTS = {
    DEFAULT: formatPrompt(CONFIG.username),
    ANONYMOUS: formatPrompt('anonymous'),
    PASSWORD: 'Password: '
};

export default CONFIG;