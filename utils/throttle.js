import { getHistoryCandles, preLoadHistoryCandles, getHistoryLines, preLoadHistoryLines } from '../api/dataService.js';
import { onVisibleLogicalRangeChanged } from '../main.js';
function throttle(func, interval) {
  let lastCall = 0;
  let isFinished = true; // Flag to track if the function has finished execution

  return function (...args) {
    const now = Date.now();
    if (now - lastCall >= interval && isFinished) {
      lastCall = now;
      isFinished = false; // Mark as not finished
      try {
        func.apply(this, args);
      } finally {
        isFinished = true; // Mark as finished after execution
      }
    }
  };
}

function asyncThrottle(func, interval) {
  let lastCall = 0;
  let pendingPromise = null;
  let isFinished = true; // Flag to track if the function has finished execution

  return async function (...args) {
    const now = Date.now();
    if (now - lastCall < interval || !isFinished) {
      return pendingPromise; // Return the pending promise if within the interval or if not finished
    }
    lastCall = now;
    isFinished = false; // Mark as not finished
    pendingPromise = func.apply(this, args);
    try {
      const result = await pendingPromise;
      return result;
    } catch (error) {
      throw error;
    } finally {
      isFinished = true; // Mark as finished after completion
      pendingPromise = null; // Reset the promise
    }
  };
}

// Example usage:
const throttleInterval = 1000; // Throttle interval in milliseconds

const throttledGetHistoryCandles = asyncThrottle(getHistoryCandles, throttleInterval);
const throttledPreLoadHistoryCandles = asyncThrottle(preLoadHistoryCandles, throttleInterval);
const throttledGetHistoryLines = asyncThrottle(getHistoryLines, throttleInterval);
const throttledPreLoadHistoryLines = asyncThrottle(preLoadHistoryLines, throttleInterval);

const onVisibleLogicalRangeChangedThrottled = throttle(onVisibleLogicalRangeChanged, throttleInterval);


// let debounceTimer;
// function onVisibleLogicalRangeChangedDebounced(newVisibleLogicalRange) {
//     clearTimeout(debounceTimer);
//     debounceTimer = setTimeout(() => onVisibleLogicalRangeChanged(newVisibleLogicalRange), 250); // 500 ms debounce period
// }
export {
  throttle, asyncThrottle
  // , throttledGetHistoryCandles, throttledPreLoadHistoryCandles, throttledGetHistoryLines, throttledPreLoadHistoryLines, onVisibleLogicalRangeChangedThrottled

}