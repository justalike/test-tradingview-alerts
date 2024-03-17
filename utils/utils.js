// Utility functions for series creation

export function processTimeFrames(data) {
  data.sort((a, b) => a.start - b.start);
  const processedData = [];
  for (let i = 0; i < data.length; i++) {
    const current = data[i];
    let merged = current;
    while (i < data.length - 1 && current.end > data[i + 1].start) {
      const next = data[i + 1];
      merged = {
        start: current.start,
        end: Math.max(merged.end, next.end),
        startValue: current.startValue,
        endValue: next.endValue ? Math.max(merged.endValue, next.endValue) : merged.endValue
      };
      i++;
    }
    processedData.push(merged);
  }
  return processedData;
}
export function setChartSize(chart) {
  chart.applyOptions({ width: window.innerWidth, height: window.innerHeight });
}
export const createSeries = (chart, type, config) => {
    const seriesTypes = {
      candlestick: () => chart.addCandlestickSeries(config),
      line: () => chart.addLineSeries(config),
      histogram: () => chart.addHistogramSeries(config),
      // Add more as needed
    };
    if (!seriesTypes[type]) {
        throw new Error(`Unsupported series type: ${type}`);
      }
    
      return seriesTypes[type]();
    };

export const updateSeriesData = (series, data) => {
    series.setData(data);
  };
  
  export const updateSeriesOptions = (series, options) => {
    series.applyOptions(options);
  };
  
  // Example: toggling the visibility of a series
  export const toggleSeriesVisibility = (series, isVisible) => {
    series.applyOptions({ visible: isVisible });
  };

  export const getQueryParams = async function() {
    try{
   console.log(`Getting query parameters`)
    const queryParams = {};
    const urlSearchParams = new URLSearchParams(window.location.search);
    for (const [key, value] of urlSearchParams.entries()) {
      queryParams[key] = value;
    }
   console.log(`Query parameters: ${JSON.stringify(queryParams)}`)
    return queryParams;
  } catch (error) {
    console.error('Error getting query parameters:', error);
   }
  }


  const logNullValues = (array, name) => {
    array.forEach((item, index) => {
      Object.entries(item).forEach(([key, value]) => {
        if (value === null) {
          console.log(`${name} item ${index}, key '${key}' is null`);
        }
      });
    });
  }

  /**
 * Checks if an object meets all specified conditions.
 * @param {Object} object - The object to validate.
 * @param {Array} conditions - An array of conditions, each an object specifying the property to check and a function to validate it.
 * @returns {boolean} - True if all conditions are met, false otherwise.
 */
export function validateObject(object, conditions) {
  return conditions.every(condition => {
    const { property, validator } = condition;
    const value = object[property];
    return validator(value);
  });
}