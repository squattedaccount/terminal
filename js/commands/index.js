/**
 * Command Loader
 * 
 * This module imports all command files and registers them with the command registry.
 * It serves as the central point for command management, ensuring all commands are
 * loaded and available when the application starts.
 */

import CommandRegistry from './registry.js';

// Import all command modules
import about from './about.js';
import clear from './clear.js';
import collection from './collection.js';
import help from './help.js';
import lang from './lang.js';
import legal from './legal.js';
import links from './links.js';
import mint from './mint.js';

import connect from './connect.js';
import disconnect from './disconnect.js';
import roadmap from './roadmap.js';
import status from './status.js';
import supply from './supply.js';
import team from './team.js';
import winamp from './winamp.js';
import list from './list.js';
import set from './set.js';
import draw from './draw.js';
import verify from './verify.js';

const commandsToRegister = [
  // General & Info Commands
  about,
  collection,
  help,
  lang,
  legal,
  links,
  roadmap,
  status,
  supply,
  team,
  winamp,

  // Web3 Commands
  connect,
  disconnect,
  mint,
  verify,

  // System & Utility
  ...clear,
  list,
  set,

  // Experimental
  ...draw,
];

/**
 * Initializes the command system by registering all imported commands.
 */
function initializeCommands() {
  commandsToRegister.forEach(command => {
    // The commandsToRegister array is now a flat list of command objects.
    if (command) {
      CommandRegistry.register(command);
    }
  });
}

export { initializeCommands };
