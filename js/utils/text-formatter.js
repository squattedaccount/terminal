/**
 * Text formatting utilities
 * 
 * Standardizes text formatting for command output from any source
 */

/**
 * Process command output text to standardize format
 * @param {string|Array} input - Raw command output (string from i18n or array)
 * @returns {Array} Standardized array of text lines
 */
export function standardizeCommandOutput(input) {
  if (!input) return [];
  
  // If already an array, return it directly
  if (Array.isArray(input)) {
    return input;
  }
  
  // Handle string input (from i18n or direct returns)
  // Clean up HTML
  const tempDiv = document.createElement('div');
  const contentWithNewlines = input.replace(/<br\s*\/?\s*>/gi, '\n');
  tempDiv.innerHTML = contentWithNewlines;
  const plainText = tempDiv.textContent || tempDiv.innerText || "";
  
  // Split into lines and process
  const lines = plainText.split('\n');
  
  // Clean up lines
  const processedLines = [];
  let emptyLineAdded = false;
  
  lines.forEach(line => {
    const trimmedLine = line.trim();
    
    // Handle empty lines
    if (trimmedLine === '') {
      // Only add one empty line if multiple empty lines are found in sequence
      if (!emptyLineAdded) {
        processedLines.push('');
        emptyLineAdded = true;
      }
      return;
    }
    
    // Reset empty line flag
    emptyLineAdded = false;
    
    // Add the processed line
    processedLines.push(trimmedLine);
  });
  
  return processedLines;
}

export default {
  standardizeCommandOutput
}; 