/**
 * Animation utility functions
 */

import DOMUtils from './dom.js';

const AnimationUtils = {
  /**
   * Animate typing effect for text
   * @param {HTMLElement} element - Element to animate
   * @param {string} text - Text to type
   * @param {number} speed - Typing speed in milliseconds
   * @param {Function} callback - Callback after animation
   */
  typeText(element, text, speed = 30, callback) {
    let i = 0;
    element.textContent = '';
    
    function type() {
      if (i < text.length) {
        element.textContent += text.charAt(i);
        i++;
        setTimeout(type, speed);
      } else if (callback) {
        callback();
      }
    }
    
    type();
  },
  
  /**
   * Animate text with a glitch effect
   * @param {HTMLElement} element - Element to animate
   * @param {string} finalText - Final text to display
   * @param {number} duration - Animation duration in milliseconds
   * @param {Function} callback - Callback after animation
   */
  glitchText(element, finalText, duration = 1000, callback) {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*()-_=+[]{}|;:,.<>/?';
    const steps = 10;
    const stepDuration = duration / steps;
    let step = 0;
    
    function glitch() {
      if (step < steps) {
        // Generate random text of the same length as the final text
        let randomText = '';
        for (let i = 0; i < finalText.length; i++) {
          // Gradually increase the chance of showing the correct character
          const correctChance = step / steps;
          if (Math.random() < correctChance) {
            randomText += finalText[i];
          } else {
            randomText += chars[Math.floor(Math.random() * chars.length)];
          }
        }
        element.textContent = randomText;
        step++;
        setTimeout(glitch, stepDuration);
      } else {
        element.textContent = finalText;
        if (callback) callback();
      }
    }
    
    glitch();
  },
  
  /**
   * Animate a fade-in effect
   * @param {HTMLElement} element - Element to animate
   * @param {number} duration - Animation duration in milliseconds
   * @param {Function} callback - Callback after animation
   */
  fadeIn(element, duration = 500, callback) {
    DOMUtils.fadeIn(element, duration);
    if (callback) {
      setTimeout(callback, duration);
    }
  },
  
  /**
   * Animate a fade-out effect
   * @param {HTMLElement} element - Element to animate
   * @param {number} duration - Animation duration in milliseconds
   * @param {Function} callback - Callback after animation
   */
  fadeOut(element, duration = 500, callback) {
    DOMUtils.fadeOut(element, duration, callback);
  }
};

export default AnimationUtils;