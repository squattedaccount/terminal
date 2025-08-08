import { eventBus } from '../utils/events.js';

// Accessibility helpers
let statusEl = null;
let previousFocus = null;

function ensureStatusEl() {
  if (statusEl) return;
  statusEl = document.createElement('div');
  statusEl.id = 'draw-mode-status';
  statusEl.setAttribute('role', 'status');
  statusEl.setAttribute('aria-live', 'polite');
  // Visually hidden but accessible to screen readers
  Object.assign(statusEl.style, {
    position: 'absolute',
    width: '1px',
    height: '1px',
    overflow: 'hidden',
    clip: 'rect(0 0 0 0)',
    clipPath: 'inset(50%)',
    whiteSpace: 'nowrap',
  });
  document.body.appendChild(statusEl);
}

function announce(message) {
  ensureStatusEl();
  statusEl.textContent = message;
}


let active = false;

function isActive() {
  return active;
}

function enter() {
  if (active) return;
  previousFocus = document.activeElement;
  document.body.classList.add('matrix-draw-fullscreen');
  announce('Draw mode on');
  active = true;
  document.addEventListener('keydown', handleKeyDown);
  // Notify other modules
  eventBus.emit('draw:state', { active: true });
  
}

function exit() {
  if (!active) return;
  active = false;
  document.removeEventListener('keydown', handleKeyDown);
  document.body.classList.remove('matrix-draw-fullscreen');
  announce('Draw mode off');
  if (previousFocus && typeof previousFocus.focus === 'function') {
    previousFocus.focus();
  }
  previousFocus = null;
  eventBus.emit('draw:state', { active: false });

}

function toggle() {
  active ? exit() : enter();
}

function handleKeyDown(event) {
  const { key } = event;
  if (key === 'Escape') {
    exit();
    return;
  }
  // Accept single printable characters only
  if (key.length === 1) {
    eventBus.emit('draw:keyInput', { char: key, shift: event.shiftKey });
  }
}

export { enter, exit, toggle, isActive };
