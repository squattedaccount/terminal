const loadedScripts = new Map();

/**
 * Dynamically loads a script and returns a promise that resolves when the script is loaded.
 * Caches the promise to prevent reloading the same script.
 * @param {string} src The URL of the script to load.
 * @returns {Promise<void>}
 */
export function loadScript(src) {
  if (loadedScripts.has(src)) {
    return loadedScripts.get(src);
  }

  const promise = new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = src;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error(i18n.t('terminal.error.failedToLoadScript', { src })));
    document.head.appendChild(script);
  });

  loadedScripts.set(src, promise);
  return promise;
}
