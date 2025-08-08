// Centralised configuration for Simple Matrix animation.

const CONFIG = {
  CELL_HEIGHT: 22,
  CHAR_WIDTH: 9.6,
  FONT_SIZE: 18, // Should match CSS
  MATRIX_CHARS: [
    'A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L', 'M',
    'N', 'O', 'P', 'Q', 'R', 'S', 'T', 'U', 'V', 'W', 'X', 'Y', 'Z',
    'a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i', 'j', 'k', 'l', 'm',
    'n', 'o', 'p', 'q', 'r', 's', 't', 'u', 'v', 'w', 'x', 'y', 'z',
    '0', '1', '2', '3', '4', '5', '6', '7', '8', '9',
    '+', '-', '*', '/', '=', '<', '>', '!', '?', '@', '#', '$', '%', '&',
  ],
  DEFAULT_WIDTH: 300, // For left side responsive calculation
  RESIZE_DEBOUNCE: 150,
  DEBOUNCE_DELAY: 350, // Delay to wait for CSS transition to finish

  EMPTY_CELL_PROBABILITY_INITIAL: 0.25,
  GLOBAL_CHANGE_INTERVAL_MIN: 3750,
  GLOBAL_CHANGE_INTERVAL_MAX: 7500,
  FADE_DURATION: 3000,
  BECOME_EMPTY_PROBABILITY_ON_CHANGE: 0.2,
  RIGHT_SIDE_COLUMNS: 2,
  CLICK_GRACE_PERIOD: 300, // ms, time hover effect defers to a recent click
  CLICK_TRANSITION_DURATION: 1, // ms, effectively instant transition for click changes
};

export default CONFIG;
