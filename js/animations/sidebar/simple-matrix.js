/**
 * Simplified Matrix-style Text Animation
 * 
 * Features:
 * - Dynamic grid resizing.
 * - Globally triggered random character changes.
 * - Slow fade transitions for character changes.
 * - Chance for characters to become empty spaces.
 */

import { eventBus } from '../../utils/events.js'; // Assuming eventBus might be used later for theme, etc.
import logger from '../../core/logger.js';
import CONFIG from './simple-matrix-config.js';

// CONFIG moved to separate module


function getRandomChar() {
    return CONFIG.MATRIX_CHARS[Math.floor(Math.random() * CONFIG.MATRIX_CHARS.length)];
}

class Cell {
    constructor() {
        this.char = ' ';
        this.opacity = 0; // Start fully transparent, will be faded in

        // Transition properties
        this.targetChar = ' ';
        this.targetOpacity = 0;
        this.transitionStartTime = 0;
        this.transitionDuration = 0;
        this.isTransitioning = false;
        this.onTransitionComplete = null;

        this.isHovered = false; // New property for hover state
        this.lastClickTime = 0; // Timestamp of the last click affecting this cell
    }

    // Initializes the cell without a transition (e.g., on grid creation)
    setTo(char, opacity = 1) {
        this.char = char;
        this.opacity = char === ' ' ? 0 : opacity; // Spaces are effectively 0 opacity
        this.targetChar = char;
        this.targetOpacity = this.opacity;
        this.isTransitioning = false;
    }

    startTransition(newChar, newOpacity, duration, onComplete = null) {
        if (this.isTransitioning && newChar === this.targetChar) return; // Already transitioning to this

        this.previousChar = this.char;
        this.previousOpacity = this.opacity;
        
        this.targetChar = newChar;
        this.targetOpacity = newOpacity;
        this.transitionStartTime = performance.now();
        this.transitionDuration = duration;
        this.isTransitioning = true;
        this.onTransitionComplete = onComplete;

        // If not fading out to space, the current character immediately changes for multi-step morph,
        // but for simple fade, we let opacity handle it.
        // For this simple version, we'll manage char change at the end of fade.
    }

    update(currentTime) {
        if (!this.isTransitioning) {
            return false; // Nothing to update
        }

        const elapsed = currentTime - this.transitionStartTime;
        let progress = Math.min(1, elapsed / this.transitionDuration);

        // Simple linear fade for now
        // If fading out (current char is not space, target is space OR target is different char)
        if (this.targetOpacity < this.previousOpacity) { // Fading out or cross-fading
             this.opacity = this.previousOpacity * (1 - progress);
        } 
        // If fading in (current char was space, target is not OR target is different char and we are in second half of a conceptual cross-fade)
        else if (this.targetOpacity > this.previousOpacity) { // Fading in
            this.opacity = this.targetOpacity * progress; // Assumes previousOpacity was 0 if fully faded out
        } else { // Opacity is stable, character might be changing (though not in this simple fade)
            this.opacity = this.targetOpacity;
        }
        
        this.opacity = Math.max(0, Math.min(1, this.opacity));


        if (progress >= 1) {
            const oldChar = this.char;
            this.char = this.targetChar;
            this.opacity = this.targetOpacity; // Ensure final state
            this.isTransitioning = false;
            if (this.onTransitionComplete) {
                this.onTransitionComplete();
                this.onTransitionComplete = null;
            }
            return oldChar !== this.char || this.opacity !== this.previousOpacity ; // Return true if something visually changed
        }
        return true; // Still transitioning
    }
}

class SimpleMatrixGrid {
    constructor(container, side) {
        this.container = container;
        this.side = side;
        this.element = document.createElement('div');
        this.element.className = 'simple-matrix-grid'; // Use a new class name
        this.container.appendChild(this.element);

        this.cells = []; // 2D array of Cell objects
        this.rowElements = [];
        this.columnCount = 0;
        this.rowCount = 0;
        this.lastRenderedRowHtml = [];

        this.lastGlobalChangeTime = performance.now();
        this.nextGlobalChangeInterval = this.getRandomChangeInterval();

        this.animationFrameId = null;
        this.needsRender = true; // Flag to control rendering

        // Whether global random character changes are enabled
        this.randomEnabled = true;

        this.currentlyHoveredCell = null; // To track the cell under the mouse
        this.resizeObserver = null; // To handle resizing reliably
    }

    getRandomChangeInterval() {
        return CONFIG.GLOBAL_CHANGE_INTERVAL_MIN + 
               Math.random() * (CONFIG.GLOBAL_CHANGE_INTERVAL_MAX - CONFIG.GLOBAL_CHANGE_INTERVAL_MIN);
    }

    calculateDimensions() {
        const width = this.container.clientWidth;
        const height = this.container.clientHeight;
        
        let columnCount;
        if (this.side === 'right') {
            columnCount = CONFIG.RIGHT_SIDE_COLUMNS;
        } else {
            columnCount = Math.max(1, Math.floor(width / CONFIG.CHAR_WIDTH));
        }
        const rowCount = Math.max(1, Math.ceil(height / CONFIG.CELL_HEIGHT));
        return { columnCount, rowCount, width, height };
    }

    resize() {
        const { columnCount, rowCount, width, height } = this.calculateDimensions();

        // Ensure the container element itself has the correct dimensions.
        this.element.style.width = `${width}px`;
        this.element.style.height = `${height}px`;

        if (this.columnCount === columnCount && this.rowCount === rowCount) {
            return; // No change in grid size needed.
        }

        // Adjust rows
        // Add new rows if needed
        for (let y = this.rowCount; y < rowCount; y++) {
            const rowElement = document.createElement('div');
            rowElement.className = 'matrix-row';
            this.element.appendChild(rowElement);
            this.rowElements.push(rowElement);
            this.cells.push([]);
            this.lastRenderedRowHtml.push('');
        }
        // Remove excess rows if needed
        while (this.rowCount > rowCount) {
            this.element.removeChild(this.rowElements.pop());
            this.cells.pop();
            this.lastRenderedRowHtml.pop();
            this.rowCount--;
        }
        this.rowCount = rowCount;

        // Adjust columns for every row
        for (let y = 0; y < this.rowCount; y++) {
            const row = this.cells[y];
            // Add new cells if needed
            for (let x = row.length; x < columnCount; x++) {
                const cell = new Cell();
                const isInitiallyEmpty = Math.random() < CONFIG.EMPTY_CELL_PROBABILITY_INITIAL;
                const initialChar = isInitiallyEmpty ? ' ' : getRandomChar();
                cell.setTo(initialChar, 1.0);
                row.push(cell);
            }
            // Remove excess cells if needed
            if (row.length > columnCount) {
                row.length = columnCount;
            }
        }

        this.columnCount = columnCount;
        this.needsRender = true; // Force a full re-render to show changes
    }

    triggerRandomCellChange(currentTime) {
        if (this.rowCount === 0 || this.columnCount === 0) return;

        // Select a random cell that is not currently hovered
        let y, x, cell;
        let attempts = 0;
        const MAX_ATTEMPTS = this.rowCount * this.columnCount > 0 ? this.rowCount * this.columnCount : 10; // Avoid infinite loop if all cells are hovered
        do {
            y = Math.floor(Math.random() * this.rowCount);
            x = Math.floor(Math.random() * this.columnCount);
            cell = this.cells[y]?.[x];
            attempts++;
        } while (cell && cell.isHovered && attempts < MAX_ATTEMPTS);

        if (!cell || cell.isHovered) { // If we couldn't find a non-hovered cell or hit max attempts
            // No non-hovered cell found or max attempts reached.
            return;
        }

        let newChar;
        let newOpacity;

        if (cell.char === ' ') { // If currently empty, always change to a character
            newChar = getRandomChar();
            newOpacity = 1.0;
        } else { // If has a character
            const becomesEmpty = Math.random() < CONFIG.BECOME_EMPTY_PROBABILITY_ON_CHANGE;
            if (becomesEmpty) {
                newChar = ' ';
                newOpacity = 0.0;
            } else {
                newChar = getRandomChar();
                if (newChar === cell.char) { // Avoid transitioning to the same char
                    newChar = getRandomChar(); 
                }
                newOpacity = 1.0;
            }
        }
        
        // To make it a two-stage fade (current fades out, then new fades in)
        // 1. Fade out current char (if it's not already a space)
        if (cell.char !== ' ') {
            cell.startTransition(' ', 0, CONFIG.FADE_DURATION / 2, () => {
                // 2. Once faded out, fade in the new char
                cell.char = ' '; // Ensure it's internally a space before fading in new
                cell.startTransition(newChar, newOpacity, CONFIG.FADE_DURATION / 2);
            });
        } else { // If cell is already a space, just fade in the new character
             cell.startTransition(newChar, newOpacity, CONFIG.FADE_DURATION);
        }
        this.needsRender = true;
    }

    update(currentTime) {
        let anythingChanged = false;
        for (let y = 0; y < this.rowCount; y++) {
            for (let x = 0; x < this.columnCount; x++) {
                if (this.cells[y]?.[x]?.update(currentTime)) {
                    anythingChanged = true;
                }
            }
        }
        if (anythingChanged) {
            this.needsRender = true;
        }

        // Global change trigger
        if (this.randomEnabled && (currentTime - this.lastGlobalChangeTime > this.nextGlobalChangeInterval)) {
            this.triggerRandomCellChange(currentTime);
            this.lastGlobalChangeTime = currentTime;
            this.nextGlobalChangeInterval = this.getRandomChangeInterval();
        }
    }

    render() {
        if (!this.needsRender) return;

        for (let y = 0; y < this.rowCount; y++) {
            if (!this.rowElements[y] || !this.cells[y]) continue;
            
            const rowHtmlParts = [];
            for (let x = 0; x < this.columnCount; x++) {
                const cell = this.cells[y][x];
                if (!cell) {
                    rowHtmlParts.push('<span>&nbsp;</span>'); // Should not happen if grid is consistent
                    continue;
                }
                const displayChar = cell.char === ' ' ? '&nbsp;' : cell.char;
                // Opacity directly on span style
                rowHtmlParts.push(
                    `<span style="opacity: ${cell.opacity.toFixed(2)};">${displayChar}</span>`
                );
            }
            const newRowHtml = rowHtmlParts.join('');
            if (this.lastRenderedRowHtml[y] !== newRowHtml) {
                this.rowElements[y].innerHTML = newRowHtml;
                this.lastRenderedRowHtml[y] = newRowHtml;
            }
        }
        this.needsRender = false; 
    }

    start() {
        const animate = (time) => {
            this.update(time);
            this.render();
            this.animationFrameId = requestAnimationFrame(animate);
        };
        this.animationFrameId = requestAnimationFrame(animate);
        logger.debug(`Simple Matrix animation started for side: ${this.side}`);
    }

    stop() {
        if (this.resizeObserver) {
            this.resizeObserver.disconnect();
        }

        if (this.animationFrameId) {
            cancelAnimationFrame(this.animationFrameId);
        }
        if (this.container) { // General container for listeners
            if (this.side === 'left') {
                this.container.removeEventListener('mousemove', this.handleMouseMove);
                this.container.removeEventListener('mouseleave', this.handleMouseLeave);
                this.container.removeEventListener('click', this.handleGridClick);
                eventBus.off('rightSideCharacterClicked', this.handleRightSideClick); // Remove listener
            } else if (this.side === 'right') {
                this.container.removeEventListener('click', this.handleRightSideCharEmitterClick);
            }
        }
    }

    // Hover handling methods - to be bound and called by event listeners
    handleMouseMove = (event) => { // Use arrow function to bind `this` correctly
        if (this.side !== 'left') return;

        const rect = this.container.getBoundingClientRect();
        const mouseX = event.clientX - rect.left;
        const mouseY = event.clientY - rect.top;

        const col = Math.floor(mouseX / CONFIG.CHAR_WIDTH);
        const row = Math.floor(mouseY / CONFIG.CELL_HEIGHT);

        let cellUnderMouse = null;
        if (row >= 0 && row < this.rowCount && col >= 0 && col < this.columnCount) {
            cellUnderMouse = this.cells[row]?.[col];
        }

        if (this.currentlyHoveredCell && this.currentlyHoveredCell !== cellUnderMouse) {
            this.currentlyHoveredCell.isHovered = false;
            // When mouse moves off, it stays '_' until global animation changes it or it gets re-hovered.
            // Or, we can trigger a fade back to its original char if we stored it.
            // For now, let it persist as per original request for the other animation.
            this.needsRender = true;
            this.currentlyHoveredCell = null;
        }

        if (cellUnderMouse && (!cellUnderMouse.isHovered || this.currentlyHoveredCell !== cellUnderMouse)) {
            if(this.currentlyHoveredCell && this.currentlyHoveredCell !== cellUnderMouse){
                 this.currentlyHoveredCell.isHovered = false; // Unhover previous one
                 this.needsRender = true;
            }
            
            // If not recently clicked, apply hover effect
            if (performance.now() - cellUnderMouse.lastClickTime > CONFIG.CLICK_GRACE_PERIOD) {
                if (!cellUnderMouse.isHovered) { // Only apply if not already marked as hovered by itself
                    cellUnderMouse.isHovered = true;
                    cellUnderMouse.isTransitioning = false; // Stop any ongoing transition
                    cellUnderMouse.char = '_';
                    cellUnderMouse.opacity = 1.0;
                    this.needsRender = true;
                }
            } // If recently clicked, isHovered might be true, but we don't override char to '_'
            // We still mark it as the currently hovered cell for tracking purposes
            this.currentlyHoveredCell = cellUnderMouse;
            // Ensure isHovered is true if it is indeed under mouse, even if click grace period is active
            if (!cellUnderMouse.isHovered) {
                cellUnderMouse.isHovered = true; // Mark as hovered for tracking, char change is conditional
            }

        } else if (!cellUnderMouse && this.currentlyHoveredCell) {
            // Mouse moved to an empty area within the box, but not over a cell
            this.currentlyHoveredCell.isHovered = false;
            this.needsRender = true;
            this.currentlyHoveredCell = null;
        }
    }

    handleMouseLeave = (event) => { // Use arrow function to bind `this` correctly
        if (this.side !== 'left') return;

        if (this.currentlyHoveredCell) {
            this.currentlyHoveredCell.isHovered = false;
            // Character remains '_' until next global update cycle changes it or it's re-hovered.
            // Or, if lastClickTime is recent, it might be something else.
            // If performance.now() - this.currentlyHoveredCell.lastClickTime <= CONFIG.CLICK_GRACE_PERIOD, it means a click just happened.
            // The character will be what the click set it to.
            // If hover was also on it, isHovered would be false now, but the char is not '_'.
            // This seems fine. The _ will re-assert if mouse moves back over it after grace period.
            this.needsRender = true;
            this.currentlyHoveredCell = null;
        }
    }

    // Click handling method
    handleGridClick = (event) => {
        if (this.side !== 'left') return;

        // Check if the click originated from within grid.element (which is this.element)
        let currentElement = event.target;
        let clickedWithinGrid = false;
        while (currentElement && currentElement !== this.container) { // Check up to sideBox (this.container)
            if (currentElement === this.element) {
                clickedWithinGrid = true;
                break;
            }
            currentElement = currentElement.parentElement;
        }

        if (!clickedWithinGrid) {
            return; // Click was outside the actual grid cells
        }

        const newRandomChar = getRandomChar();
        const currentTime = performance.now();
        let changedCount = 0;

        for (let y = 0; y < this.rowCount; y++) {
            for (let x = 0; x < this.columnCount; x++) {
                const cell = this.cells[y]?.[x];
                if (cell && cell.char === '_') { // Only change existing underscores
                    cell.lastClickTime = currentTime;
                    // Transition to the new char. Use the new fast click transition duration.
                    cell.startTransition(newRandomChar, 1.0, CONFIG.CLICK_TRANSITION_DURATION);
                    changedCount++;
                    this.needsRender = true;
                }
            }
        }

        if (changedCount > 0) {
            logger.debug(`[GridClick L] Changed ${changedCount} '_' to '${newRandomChar}'`);
        }
    }

    // Handler for clicks on the right side, emits event with character
    handleRightSideCharEmitterClick = (event) => {
        // Called when the right sideBox is clicked.
        // Determine which character was clicked.
        const rect = this.container.getBoundingClientRect();
        const mouseX = event.clientX - rect.left;
        const mouseY = event.clientY - rect.top;

        const col = Math.floor(mouseX / CONFIG.CHAR_WIDTH);
        const row = Math.floor(mouseY / CONFIG.CELL_HEIGHT);

        if (row >= 0 && row < this.rowCount && col >= 0 && col < this.columnCount) {
            const cell = this.cells[row]?.[col];
            if (cell && cell.char !== ' ' && cell.opacity > 0.5) { // Clicked on a visible character
                logger.debug(`[RightSideClick] Emitting char: ${cell.char}`);
                eventBus.emit('rightSideCharacterClicked', cell.char);
            }
        }
    }

    // Handler for when a character is clicked on the right side (listened to by left grid)
    handleRightSideClick = (clickedChar) => {
        if (this.side !== 'left') return; // Only left grid reacts

        logger.debug(`[Left Grid] Received rightSideCharacterClicked event with char: ${clickedChar}`);
        const currentTime = performance.now();
        let changedCount = 0;

        for (let y = 0; y < this.rowCount; y++) {
            for (let x = 0; x < this.columnCount; x++) {
                const cell = this.cells[y]?.[x];
                if (cell && cell.char === '_') { // Only change existing underscores
                    cell.lastClickTime = currentTime; // Update lastClickTime to manage hover grace period
                    cell.startTransition(clickedChar, 1.0, CONFIG.CLICK_TRANSITION_DURATION);
                    changedCount++;
                    this.needsRender = true;
                }
            }
        }
        if (changedCount > 0) {
            logger.debug(`[Left Grid] Changed ${changedCount} '_' to clicked char '${clickedChar}' from right side.`);
        }
    }
}

// Main exported object
const SimpleMatrixAnimation = {
    create() { // container parameter is no longer needed
        const appContainer = document.getElementById('app-container');
        if (!appContainer) {
            logger.error('App container not found for Simple Matrix animation');
            return;
        }
        if (!terminal) {
            logger.error('Terminal element not found for Simple Matrix animation');
            return;
        }
        logger.debug('Initializing Simple Matrix Animation...');

        const createSide = (side) => {
            const sideBox = document.createElement('div');
            sideBox.className = `simple-matrix-container terminal-side-box terminal-side-box-${side}`;
            sideBox.dataset.side = side;
            
            // Basic positioning (can be refined by CSS)


        // Determine initial width before adding to DOM to avoid flash resize
        let boxWidth;
        if (side === 'left') {
            const idealResponsiveWidth = Math.min(CONFIG.DEFAULT_WIDTH, Math.max(100, window.innerWidth * 0.15));
            const numCols = Math.floor(idealResponsiveWidth / CONFIG.CHAR_WIDTH);
            boxWidth = Math.max(CONFIG.CHAR_WIDTH * 5, numCols * CONFIG.CHAR_WIDTH); // Ensure min width
            document.documentElement.style.setProperty('--left-animation-width', `${boxWidth}px`);
        } else {
            boxWidth = CONFIG.CHAR_WIDTH * CONFIG.RIGHT_SIDE_COLUMNS;
            document.documentElement.style.setProperty('--right-animation-width', `${boxWidth}px`);
        }
        sideBox.style.width = `${boxWidth}px`; // Set correct width immediately
sideBox.style.overflow = 'hidden';
sideBox.style.backgroundColor = 'var(--color-background)'; // Use the correct theme variable
sideBox.style.height = '100%'; // Explicitly set height

            if (side === 'left') {
                // Prepend the left sidebar to the app container
                appContainer.prepend(sideBox);
            } else {
                // Append the right sidebar to the app container
                appContainer.appendChild(sideBox);
            }

            const grid = new SimpleMatrixGrid(sideBox, side);
            // Track draw transition state and debounce handle for resize
            let drawTransitioning = false;
            let resizeDebounce = null;

            // Add listeners based on side
            if (side === 'left') {
                sideBox.addEventListener('mousemove', grid.handleMouseMove);
                sideBox.addEventListener('mouseleave', grid.handleMouseLeave);
                sideBox.addEventListener('click', grid.handleGridClick); 
                eventBus.on('rightSideCharacterClicked', grid.handleRightSideClick);
            } else if (side === 'right') {
                sideBox.addEventListener('click', grid.handleRightSideCharEmitterClick);
            }

            // Listen for key input during draw mode (only for the left grid)
            eventBus.on('draw:keyInput', ({ char, shift }) => {
                if (side !== 'left') return;
                if (drawTransitioning) return; // skip during enter/exit to reduce jank
                if (!char || char.length !== 1) return;
                if (!CONFIG.MATRIX_CHARS.includes(char)) return;
                // Ignore Shift+key global replace functionality (feature removed)
                if (shift) return;

                let changedCount = 0;

                if (shift) {
                    // Replace ALL characters with the pressed key
                    for (let y = 0; y < grid.rowCount; y++) {
                        for (let x = 0; x < grid.columnCount; x++) {
                            const cell = grid.cells[y]?.[x];
                            if (!cell) continue;
                            cell.startTransition(char, 1.0, CONFIG.CLICK_TRANSITION_DURATION);
                            changedCount++;
                        }
                    }
                    grid.needsRender = true;
                    if (changedCount > 0) {
                        logger.debug(`[DrawKey] (SHIFT) Replaced entire grid with '${char}'`);
                    }
                } else {
                    // Original behaviour: only replace underscore placeholders
                    for (let y = 0; y < grid.rowCount; y++) {
                        for (let x = 0; x < grid.columnCount; x++) {
                            const cell = grid.cells[y]?.[x];
                            if (cell && cell.char === '_') {
                                cell.startTransition(char, 1.0, CONFIG.CLICK_TRANSITION_DURATION);
                                changedCount++;
                                grid.needsRender = true;
                            }
                        }
                    }
                    if (changedCount > 0) {
                        logger.debug(`[DrawKey] Changed ${changedCount} '_' to '${char}'`);
                    }
                }
            });

            // Use ResizeObserver to reliably trigger grid redraws AFTER the container's size has changed.
            const resizeObserver = new ResizeObserver(() => {
                // During transitions, debounce resize work to the tail to avoid thrashing
                if (drawTransitioning) {
                    if (resizeDebounce) clearTimeout(resizeDebounce);
                    resizeDebounce = setTimeout(() => {
                        grid.resize();
                        grid.needsRender = true;
                        resizeDebounce = null;
                    }, 120);
                    return;
                }
                grid.resize();
                grid.needsRender = true;
            });
            resizeObserver.observe(sideBox);
            grid.resizeObserver = resizeObserver; // Store for cleanup

            // Listen for the draw mode toggle
            eventBus.on('draw:state', ({ active, transitioning }) => {
                // Track transitioning to gate expensive work
                if (typeof transitioning === 'boolean') {
                    drawTransitioning = transitioning;
                }
                
                if (active) {
                    // Disable random changes during draw mode for the left grid
                    if (side === 'left') {
                        grid.randomEnabled = false;
                        
                    }
                    
                    if (side === 'left') {
                        // Prepare clip-path reveal: compute column steps and inject CSS vars
                        // Compute starting clip so original box width stays visible
                        const initialRatio = boxWidth / window.innerWidth;
                        const clipStart = Math.max(0, 100 - initialRatio * 100);

                        const colSteps = Math.max(1, Math.round(window.innerWidth / CONFIG.CHAR_WIDTH));
                        sideBox.style.setProperty('--draw-col-steps', colSteps);
                        sideBox.style.setProperty('--draw-clip-start', `${clipStart}%`);
                        sideBox.style.setProperty('--draw-expand-duration', '2s');
                        // Ensure full width immediately, animation handled by clip-path
                        sideBox.style.width = '';
                        // Trigger animation
                        sideBox.classList.add('reveal-columns');
                        
                    }
                } else {
                    
                    // Re-enable random changes when exiting draw mode
                    if (side === 'left') {
                        grid.randomEnabled = true;
                        // Reset timers to avoid an immediate change after re-enable
                        grid.lastGlobalChangeTime = performance.now();
                        grid.nextGlobalChangeInterval = grid.getRandomChangeInterval();
                    }
                    if (side === 'left') {
                        // Add collapsing class to hide scrollbars during width transition
                        document.body.classList.add('matrix-draw-collapsing');

                        const onTransitionEnd = (e) => {
                            if (e.propertyName === 'width') {
                                document.body.classList.remove('matrix-draw-collapsing');
                                sideBox.removeEventListener('transitionend', onTransitionEnd);
                            }
                        };
                        sideBox.addEventListener('transitionend', onTransitionEnd);

                        // Restore width based on current window size (debounced if transitioning)
                        if (drawTransitioning) {
                            if (resizeDebounce) clearTimeout(resizeDebounce);
                            resizeDebounce = setTimeout(() => {
                                handleContainerResize();
                                resizeDebounce = null;
                            }, 100);
                        } else {
                            handleContainerResize();
                        }
                        // Remove clip-path reveal class & vars
                        sideBox.classList.remove('reveal-columns');
                        sideBox.style.removeProperty('--draw-col-steps');
                        sideBox.style.removeProperty('--draw-expand-duration');
                         sideBox.style.removeProperty('--draw-clip-start');
                    }
                }

                // The grid's ResizeObserver will automatically trigger a resize and redraw
                // when the container's class changes and its dimensions are updated by the CSS.
            });

            // This function now ONLY handles updating the container's width on window resize.
            const handleContainerResize = () => {
                let boxWidth;
                if (side === 'left') {
                    const idealResponsiveWidth = Math.min(CONFIG.DEFAULT_WIDTH, Math.max(100, window.innerWidth * 0.15));
                    let numCols = Math.floor(idealResponsiveWidth / CONFIG.CHAR_WIDTH);
                    boxWidth = Math.max(CONFIG.CHAR_WIDTH * 5, numCols * CONFIG.CHAR_WIDTH);
                    if (boxWidth <= 0) boxWidth = CONFIG.CHAR_WIDTH * 2;
                } else {
                    boxWidth = CONFIG.CHAR_WIDTH * CONFIG.RIGHT_SIDE_COLUMNS;
                }
                // Set the width on the container, which the ResizeObserver will then detect.
                sideBox.style.width = `${boxWidth}px`;
                document.documentElement.style.setProperty(`--${side}-animation-width`, `${boxWidth}px`);
            };

            window.addEventListener('resize', handleContainerResize);
            // TODO: Add theme change listener if needed, e.g., eventBus.on('theme:change', () => grid.needsRender = true);

            handleContainerResize(); // Initial call to set dimensions and potentially CSS vars via debounced call
            grid.start();

            // Basic cleanup
            // window.addEventListener('unload', () => { // This might be too late or not always fire
            //     grid.stop();
            //     window.removeEventListener('resize', handleResize);
            // });
            // A more robust cleanup might be needed if these animations are dynamically added/removed multiple times.
        };

        // Create the sidebars. The function now handles adding them to the DOM.
        createSide('left');
        createSide('right');
        
        logger.debug('Simple Matrix Animation setup complete for both sides.');
    }
};

export default SimpleMatrixAnimation; 