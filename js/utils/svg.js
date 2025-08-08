/**
 * SVG utility functions
 * Simplified to use CSS variables for theming
 */

const SVGUtils = {
  /**
   * Character set for random character generation
   * @private
   */
  _characterSet: [
    'a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i', 'j',
    'k', 'l', 'm', 'n', 'o', 'p', 'q', 'r', 's', 't',
    'u', 'v', 'w', 'x', 'y', 'z', 'A', 'B', 'C', 'D',
    'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L', 'M', 'N',
    'O', 'P', 'Q', 'R', 'S', 'T', 'U', 'V', 'W', 'X',
    'Y', 'Z', '0', '1', '2', '3', '4', '5', '6', '7',
    '8', '9', '#', '$', '%', '-', '*', '^', '~', '+'
  ],
  
  /**
   * Generate a random character pair
   * @returns {Array<string>} A pair of random characters
   */
  getRandomCharPair() {
    const chars = this._characterSet;
    const idx1 = Math.floor(Math.random() * chars.length);
    let idx2;
    do {
      idx2 = Math.floor(Math.random() * chars.length);
    } while (idx2 === idx1);
    
    return [chars[idx1], chars[idx2]];
  },
  
  /**
   * Generate an SVG circle with characters using three-column grid layout.
   * This ensures perfect centering of the underscore with no character overlap.
   *
   * @param {Array<string>} chars - Two characters to display in the circle.
   * @param {object} [options] - Optional color overrides.
   * @param {string} [options.bgColor] - Background color hex code.
   * @param {string} [options.textColor] - Text color hex code.
   * @returns {string} SVG markup.
   */
  generateCircleSVG(chars) {
    if (!Array.isArray(chars) || chars.length !== 2) {
      chars = this.getRandomCharPair();
    }

    // Always use CSS variables for colors to ensure theme consistency
    const finalBgColor = 'var(--color-svg-background)';
    const finalTextColor = 'var(--color-svg-text)';
    const finalBorderColor = 'var(--color-svg-border)';
    
    // Fixed spacing from underscore edges: accounting for underscore width (~25px at 70px font) + 2px gap
    return `
      <svg width="180" height="180" viewBox="0 0 180 180" xmlns="http://www.w3.org/2000/svg">
        <style>
          .char-text { font-family: Arial, sans-serif; font-size: 60px; font-weight: normal; }
        </style>
        <circle cx="90" cy="90" r="88" fill="${finalBgColor}" stroke="${finalBorderColor}" stroke-width="2" />
        
        <text x="70" y="95" 
              fill="${finalTextColor}" 
              text-anchor="end" 
              dominant-baseline="middle"
              class="char-text">
          ${chars[0]}
        </text>
        
        <text x="90" y="95" 
              fill="${finalTextColor}" 
              text-anchor="middle" 
              dominant-baseline="middle"
              class="char-text">
          _
        </text>
        
        <text x="110" y="95" 
              fill="${finalTextColor}" 
              text-anchor="start" 
              dominant-baseline="middle"
              class="char-text">
          ${chars[1]}
        </text>
      </svg>`;
  }
};

export default SVGUtils;