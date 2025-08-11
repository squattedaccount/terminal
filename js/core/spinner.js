export class Spinner {
    constructor(terminal, message = 'Processing...') {
        this.terminal = terminal;
        this.frames = ['⠋', '⠙', '⠹', '⠸', '⠼', '⠴', '⠦', '⠧', '⠇', '⠏'];
        this.message = message;
        this.interval = null;
        this.frameIndex = 0;
        // A DOM element will be created by the terminal, we just manage it.
        this.lineElement = null;
        this.messageEl = null;
        this.frameEl = null;
    }

    start() {
        // Ask the terminal to create a new line and give us the element
        this.lineElement = this.terminal.appendLine('');

        // Build a fixed, non-wrapping layout to prevent reflow/jitter
        // Container stays single-line; frame uses fixed-width slot
        this.lineElement.style.whiteSpace = 'nowrap';

        this.messageEl = document.createElement('span');
        this.messageEl.className = 'spinner-message';
        this.messageEl.textContent = this.message + ' ';

        this.frameEl = document.createElement('span');
        this.frameEl.className = 'spinner-frame';
        // Fixed width prevents width changes between different glyphs
        this.frameEl.style.display = 'inline-block';
        this.frameEl.style.width = '2ch';
        this.frameEl.style.textAlign = 'left';
        this.frameEl.setAttribute('aria-hidden', 'true');
        this.frameEl.textContent = this.frames[0];

        // Attach children once
        this.lineElement.textContent = '';
        this.lineElement.appendChild(this.messageEl);
        this.lineElement.appendChild(this.frameEl);

        // Update only the frame span to avoid triggering terminal scroll logic
        this.interval = setInterval(() => {
            const frame = this.frames[this.frameIndex];
            this.frameIndex = (this.frameIndex + 1) % this.frames.length;
            if (this.frameEl) {
                this.frameEl.textContent = frame;
            }
        }, 80);
    }

    stop() {
        if (this.interval) {
            clearInterval(this.interval);
            this.interval = null;
            // Finalize the line without the spinner frame
            if (this.messageEl) {
                this.messageEl.textContent = this.message;
            }
            if (this.frameEl) {
                this.frameEl.textContent = '';
            }
        }
    }
}
