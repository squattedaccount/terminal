/**
 * Terminal Events
 * 
 * Defines standard event names and provides utilities for terminal event handling.
 * This ensures consistent event naming across all terminal components.
 */

// Terminal initialization events
export const INIT_EVENTS = {
  CORE_INITIALIZED: 'terminal:core:initialized',
  VIEW_INITIALIZED: 'terminal:view:initialized',
  CONTROLLER_INITIALIZED: 'terminal:controller:initialized',
  INPUT_INITIALIZED: 'terminal:input:initialized',
  TERMINAL_INITIALIZED: 'terminal:initialized'
};

// Terminal command events
export const COMMAND_EVENTS = {
  EXECUTE: 'terminal:command:execute',
  PROCESS: 'terminal:command:process',
  COMPLETED: 'terminal:command:completed',
  FAILED: 'terminal:command:failed',
  REGISTER: 'command:register',
  REGISTRY_INITIALIZED: 'registry:initialized'
};

// Terminal input events
export const INPUT_EVENTS = {
  SUBMIT: 'terminal:input:submit',
  CHANGED: 'terminal:input:changed',
  FOCUS: 'terminal:input:focus',
  BLUR: 'terminal:input:blur',
  CANCEL: 'terminal:input:cancel'
};

// Terminal history events
export const HISTORY_EVENTS = {
  NAVIGATE: 'terminal:history:navigate',
  ENTRY: 'terminal:history:entry',
  ADDED: 'terminal:history:added'
};

// Terminal output events
export const OUTPUT_EVENTS = {
  ADD: 'terminal:output:add',
  CLEAR: 'terminal:clear',
  PROMPT_CHANGED: 'terminal:prompt:changed'
};

// Terminal theme events
export const THEME_EVENTS = {
  CHANGED: 'theme:changed',
  CURSOR_UPDATE: 'theme:cursor:update'
};

// Terminal menu events
export const MENU_EVENTS = {
  ACTIVE: 'terminal:menu:active',
  SELECTED: 'terminal:menu:selected',
  CANCELLED: 'terminal:menu:cancelled',
  CLOSED: 'terminal:menu:closed'
};

// Combine all events for easy access
export const TERMINAL_EVENTS = {
  ...INIT_EVENTS,
  ...COMMAND_EVENTS,
  ...INPUT_EVENTS,
  ...HISTORY_EVENTS,
  ...OUTPUT_EVENTS,
  ...THEME_EVENTS,
  ...MENU_EVENTS
};

export default TERMINAL_EVENTS;
