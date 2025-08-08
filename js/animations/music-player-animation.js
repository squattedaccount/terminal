/**
 * Animates the text of the music player buttons with a rolling effect.
 *
 * @param {HTMLElement} playerElement - The music player container element.
 */
export function animateMusicPlayerButtons(playerElement) {
    const buttons = playerElement.querySelectorAll('.button-group button');
  const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  const stagger = 60; // ms between starts
  const rollCount = 12;
  const interval = 60; // ms per roll

  buttons.forEach(button => {
    const originalText = button.textContent;
    const chars = originalText.split('');
    button.textContent = ''; // Clear existing text

    const spans = chars.map(char => {
      const span = document.createElement('span');
      span.dataset.final = char;
      span.textContent = '';
      button.appendChild(span);
      return span;
    });

    const promises = spans.map((span, idx) => new Promise(resolve => {
      setTimeout(() => {
        let rolls = 0;
        const timer = setInterval(() => {
          if (rolls < rollCount) {
            span.textContent = letters.charAt(Math.floor(Math.random() * letters.length));
            rolls++;
          } else {
            clearInterval(timer);
            span.textContent = span.dataset.final;
            resolve();
          }
        }, interval);
      }, idx * stagger);
    }));

    Promise.all(promises).then(() => {
      // Animation complete
    });
  });
}
