import { eventBus } from '../utils/events.js';

// Accessibility helpers
let statusEl = null;
let previousFocus = null;
let transitioning = false;

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
  if (active || transitioning) return;
  previousFocus = document.activeElement;
  transitioning = true;
  // Batch DOM writes and notify listeners in separate frames
  requestAnimationFrame(() => {
    document.body.classList.add('matrix-draw-fullscreen');
    announce('Draw mode on');
    active = true;
    document.addEventListener('keydown', handleKeyDown);
    // Notify other modules after styles have applied
    requestAnimationFrame(() => {
      eventBus.emit('draw:state', { active: true, transitioning: true });
      // Small window for listeners to ignore heavy work
      setTimeout(() => {
        transitioning = false;
        eventBus.emit('draw:state', { active: true, transitioning: false });
      }, 300);
    });
  });
  
}

function exit() {
  if (!active || transitioning) return;
  transitioning = true;
  active = false;
  document.removeEventListener('keydown', handleKeyDown);
  requestAnimationFrame(() => {
    // During the collapse animation, keep scrollbars hidden and CLI hidden
    document.body.classList.add('matrix-draw-collapsing');
    document.body.classList.remove('matrix-draw-fullscreen');
    // Hard-hide terminal container to avoid any flicker regardless of CSS order/specificity
    const terminalContainer = document.getElementById('terminal-container');
    if (terminalContainer) {
      terminalContainer.style.display = 'none';
    }
    announce('Draw mode off');
    if (previousFocus && typeof previousFocus.focus === 'function') {
      previousFocus.focus();
    }
    previousFocus = null;
    // Notify listeners in next frame so layout settles first
    requestAnimationFrame(() => {
      eventBus.emit('draw:state', { active: false, transitioning: true });
      // Wait for the actual width transition of the left matrix to finish
      const leftContainer = document.querySelector('.simple-matrix-container[data-side="left"]');
      let finished = false;

      const completeExit = () => {
        if (finished) return;
        finished = true;
        transitioning = false;
        eventBus.emit('draw:state', { active: false, transitioning: false });
        document.body.classList.remove('matrix-draw-collapsing');
        // Restore CLI visibility now that animation is done
        if (terminalContainer) {
          terminalContainer.style.display = '';
        }
        const inputEl = document.querySelector('#terminal input.terminal-input');
        if (inputEl && typeof inputEl.focus === 'function') {
          requestAnimationFrame(() => inputEl.focus());
        }
        if (leftContainer) {
          leftContainer.removeEventListener('transitionend', onTransitionEnd, true);
        }
      };

      const onTransitionEnd = (e) => {
        // Only finish when width or height transitions complete on the left matrix container
        if (!leftContainer) return completeExit();
        if (e.target === leftContainer && (e.propertyName === 'width' || e.propertyName === 'height')) {
          completeExit();
        }
      };

      if (leftContainer) {
        leftContainer.addEventListener('transitionend', onTransitionEnd, true);
        // Fallback in case transitionend doesn't fire
        setTimeout(completeExit, 1500);
      } else {
        // No left container found; fallback to a safe delay
        setTimeout(completeExit, 600);
      }
    });
  });

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
