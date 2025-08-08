/**
 * SVG Terminal Adapter
 * 
 * This module provides utilities for adapting SVG content for display in our custom terminal.
 * It handles various SVG formats and ensures proper rendering within the terminal environment.
 * 
 * @module SVGTerminalAdapter
 * @author techno_punks Team
 * @version 1.0.0
 */

import { eventBus } from './events.js';
import logger from '../core/logger.js';

class SVGTerminalAdapter {
  /**
   * Adapt SVG content for display in the terminal
   * @param {string} svgContent - SVG content to adapt
   * @param {Object} options - Display options
   * @returns {string} HTML string for terminal display
   */
  static adaptSVGForTerminal(svgContent, options = {}) {
    const containerDiv = document.createElement('div');
    containerDiv.className = 'terminal-svg-container';
    if (options.animate) containerDiv.classList.add('animate');
    
    // Set container dimensions if provided
    if (options.width) containerDiv.style.width = options.width;
    if (options.height) containerDiv.style.height = options.height;
    if (options.className) containerDiv.classList.add(options.className);
    
    // Add SVG content
    containerDiv.innerHTML = svgContent;
    
    // Emit event for SVG rendering
    setTimeout(() => {
      eventBus.emit('terminal:svg-rendered', containerDiv);
    }, 10);
    
    return containerDiv.outerHTML;
  }
  
  /**
   * Process project output for terminal display
   * @param {Object} result - Project command result
   * @returns {string} HTML string for terminal display
   */
  static processProjectOutput(result) {
    if (!result || !result.message) return '';
    
    // For HTML blocks, return the message directly to preserve all HTML structure and scripts
    if (result.type === 'html_block' && typeof result.message === 'string') {
      logger.debug('[SVGTerminalAdapter] Processing HTML block for project command');
      
      // Create a unique container for this output
      const uniqueId = `project-output-${Date.now()}`;
      const wrappedMessage = `
        <div id="${uniqueId}" class="project-output-container" style="display:block; width:100%; position:relative; z-index:5;">
          ${result.message}
        </div>
      `;
      
      // Emit event for project output rendering
      setTimeout(() => {
        eventBus.emit('terminal:project-rendered', { id: uniqueId });
      }, 50);
      
      return wrappedMessage;
    }
    
    // Handle other types of content
    const container = document.createElement('div');
    container.className = 'project-output-container';
    
    if (typeof result.message === 'string') {
      container.innerHTML = result.message;
    } else if (Array.isArray(result.message)) {
      result.message.forEach(item => {
        if (typeof item === 'string') {
          const p = document.createElement('p');
          p.textContent = item;
          container.appendChild(p);
        } else if (item.svg) {
          const svgContainer = document.createElement('div');
          svgContainer.className = 'project-svg-container';
          svgContainer.innerHTML = item.svg;
          container.appendChild(svgContainer);
        }
      });
    }
    
    // Emit event for project output rendering
    setTimeout(() => {
      eventBus.emit('terminal:project-rendered', container);
    }, 50);
    
    return container.outerHTML;
  }
  
  /**
   * Create an animated SVG container
   * @param {string} svgContent - SVG content
   * @param {Object} options - Animation options
   * @returns {string} HTML string for terminal display
   */
  static createAnimatedSVG(svgContent, options = {}) {
    const defaultOptions = {
      animate: true,
      width: '200px',
      height: 'auto',
      className: 'animated-svg'
    };
    
    return this.adaptSVGForTerminal(svgContent, {...defaultOptions, ...options});
  }
  
  /**
   * Load SVG from URL and display in terminal
   * @param {string} url - URL of SVG file
   * @param {Object} options - Display options
   * @returns {Promise<string>} Promise resolving to HTML string for terminal display
   */
  static async loadSVGFromURL(url, options = {}) {
    try {
      const response = await fetch(url);
      if (!response.ok) throw new Error(i18n.t('terminal.error.failedToLoadSVG', { status: response.status }));
      
      const svgContent = await response.text();
      return this.adaptSVGForTerminal(svgContent, options);
    } catch (error) {
      logger.error('[SVGTerminalAdapter] Error loading SVG:', error);
      return `<div class="terminal-error">${i18n.t('terminal.error.svgLoadFailed', { message: error.message })}</div>`;
    }
  }
}

export default SVGTerminalAdapter;
