/**
 * Mobile Animation Utility
 * 
 * Reuses the terminal's line-by-line animation logic for mobile view
 */

class MobileAnimation {
  constructor() {
    // Use the same timing constants as terminal
    this.LINE_ANIMATION_BASE_DELAY_MS = 40;
    this.LINE_ANIMATION_VARIATION_MS = 20;
    this.MINIMUM_LINE_DELAY_MS = 15;
    
    // Spinner animation (same as web3 commands)
    this.spinnerFrames = ['⠋', '⠙', '⠹', '⠸', '⠼', '⠴', '⠦', '⠧', '⠇', '⠏'];
    this.spinnerInterval = null;
    this.spinnerFrameIndex = 0;
    
    // Run-control flags to avoid layout shifts on incidental resize events
    this.hasAnimated = false;
    this.lastIsMobile = null;
    
    // Mobile content
    this.mobileContent = [
      'techno_punks terminal v0.8.1',
      '---------------------------',
      '',
      'WELCOME, VIBE-HACKER',
      '',
      'Join the post-AGI survivor club where techno_punks coding the future:',
      'terminal frontend + web3 + AI',
      '',
      '/// GENESIS SPECS',
      '# network: Hyperliquid EVM',
      '# supply: 5,184, ERC721',
      '# format: onchain SVGs',
      '# DIY protocol: ACTIVE',
      '',
      '$ MINT: TBA',
      '$ No whitelists. No VCs. Pure rebellion.',
      '',
      '[SYSTEM_NOTICE]:',
      'Terminal access: desktop only.',
      'Switch to hack in! //',
      '',
      'follow the vibe: @squattedaccount',
      'the future is collaborative_',
      ''
    ];
  }

  /**
   * Pauses for a short, slightly randomized duration to simulate terminal typewriter effect
   * (Same logic as terminal-view.js)
   * @private
   */
  _pauseBetweenLines() {
    const delay = this.LINE_ANIMATION_BASE_DELAY_MS + 
                  (Math.random() * this.LINE_ANIMATION_VARIATION_MS) - 
                  (this.LINE_ANIMATION_VARIATION_MS / 2);
    const finalDelay = Math.max(this.MINIMUM_LINE_DELAY_MS, delay);
    return new Promise(resolve => setTimeout(resolve, finalDelay));
  }

  /**
   * Add a static line to the mobile container
   * @param {string} content - Line content
   * @param {HTMLElement} container - Target container
   * @private
   */
  _addStaticLine(content, container) {
    const lineElement = document.createElement('div');
    lineElement.className = 'mobile-line';

    if (content === '') {
      lineElement.innerHTML = '&nbsp;'; // Empty line with space
    } else if (content.startsWith('the future is collaborative')) {
      lineElement.textContent = content.slice(0, -1) + ' ';
      const cursor = document.createElement('span');
      cursor.className = 'blinking-cursor';
      cursor.textContent = '_';
      lineElement.appendChild(cursor);
    } else {
      lineElement.textContent = content;
    }

    container.appendChild(lineElement);
  }

  /**
   * Animate content with spinner initialization
   * @param {HTMLElement} container - Target container
   */
  async animateContent(container) {
    if (!container) return;
    
    // Clear any existing content
    container.innerHTML = '';
    
    // Step 1: Show spinner for 2 seconds
    const spinnerLine = this.startSpinner(container);
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Step 2: Stop spinner
    this.stopSpinner();

    // Step 3: Replace spinner line with the first line of content
    spinnerLine.textContent = this.mobileContent[0];

    // Animate the rest of the lines
    for (let i = 1; i < this.mobileContent.length; i++) {
      const line = this.mobileContent[i];
      this._addStaticLine(line, container);
      
      // Add delay between lines (except for the last line)
      if (i < this.mobileContent.length - 1) {
        await this._pauseBetweenLines();
      }
    }
  }

  /**
   * Start spinner animation for initialization
   * @param {HTMLElement} container - Target container
   * @param {string} message - Spinner message
   */
  startSpinner(container, message = '[INITIALIZING MOBILE VIEW]') {
    const spinnerLine = document.createElement('div');
    spinnerLine.className = 'mobile-line spinner-line';
    container.appendChild(spinnerLine);
    
    this.spinnerInterval = setInterval(() => {
      const frame = this.spinnerFrames[this.spinnerFrameIndex];
      this.spinnerFrameIndex = (this.spinnerFrameIndex + 1) % this.spinnerFrames.length;
      spinnerLine.textContent = `${message} ${frame}`;
    }, 80);
    
    return spinnerLine;
  }

  /**
   * Stop spinner animation
   */
  stopSpinner() {
    if (this.spinnerInterval) {
      clearInterval(this.spinnerInterval);
      this.spinnerInterval = null;
    }
  }

  /**
   * Check if we're on a mobile device based on screen width
   */
  isMobileDevice() {
    return window.innerWidth <= 768;
  }

  /**
   * Initialize mobile animation when mobile view becomes visible
   */
  init() {
    const mobileAbout = document.getElementById('mobile-about');
    
    if (!mobileAbout) return;
    
    // Check if we're on mobile immediately
    this.lastIsMobile = this.isMobileDevice();
    if (this.lastIsMobile && !this.hasAnimated) {
      // Small delay to ensure DOM is ready
      setTimeout(() => {
        this.animateContent(mobileAbout);
        this.hasAnimated = true;
      }, 100);
    }
    
    // Also listen for window resize in case user switches to mobile view
    let resizeTimeout;
    window.addEventListener('resize', () => {
      clearTimeout(resizeTimeout);
      resizeTimeout = setTimeout(() => {
        const isMobile = this.isMobileDevice();
        // Only animate when crossing from non-mobile to mobile for the first time
        if (isMobile && this.lastIsMobile === false && !this.hasAnimated) {
          this.animateContent(mobileAbout);
          this.hasAnimated = true;
        }
        this.lastIsMobile = isMobile;
      }, 250);
    });
  }
}

// Create singleton instance
const mobileAnimation = new MobileAnimation();

export default mobileAnimation;