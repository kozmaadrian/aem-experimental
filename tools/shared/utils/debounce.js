/**
 * Debounces function execution.
 */
export function debounce(func, wait = 500) {
  let timeout;
  return function executedFunction(...args) {
    clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
}

export default debounce;
