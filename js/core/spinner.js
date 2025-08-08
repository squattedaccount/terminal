export class Spinner {
    constructor(terminal, message = 'Processing...') {
        this.terminal = terminal;
        this.frames = ['⠋', '⠙', '⠹', '⠸', '⠼', '⠴', '⠦', '⠧', '⠇', '⠏'];
        this.message = message;
        this.interval = null;
        this.frameIndex = 0;
        // A DOM element will be created by the terminal, we just manage it.
        this.lineElement = null; 
    }

    start() {
        // Ask the terminal to create a new line and give us the element
        this.lineElement = this.terminal.appendLine('');
        
        this.interval = setInterval(() => {
            const frame = this.frames[this.frameIndex];
            this.frameIndex = (this.frameIndex + 1) % this.frames.length;
            
            // Update the content of the spinner line
            this.terminal.updateLine(this.lineElement, `${this.message} ${frame}`);
        }, 80);
    }

    stop() {
        if (this.interval) {
            clearInterval(this.interval);
            this.interval = null;
            // Update the line one last time to show just the message, removing the spinner.
            this.terminal.updateLine(this.lineElement, this.message);
        }
    }
}
