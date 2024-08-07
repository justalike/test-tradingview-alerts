
import * as cfg from './config/index.js';
import { throttle, asyncThrottle } from './utils/throttle.js';
import { createSeries, updateSeriesData, setChartSize, getQueryParams, getCurrentYYMMDD, calculateVMA, updateSeriesOptions, removeSeries } from './utils/utils.js';
import { initializeChartWithData, updateChartWithExtremaData, updateChartWithTrendData, updateChartWithWaveData } from './chart/chartUpdateService.js';
import { fetchCandleData, getHistoryCandles, preLoadHistoryCandles, getHistoryLines, preLoadHistoryLines } from './api/dataService.js';
import { connectWebSocket } from './api/ws.js';
import { handleCandleDataUpload } from './local/localHandler.js';
import { getZoomTresholds, reloadPageWithNewTimeframe, changeToHigherTimeframe, changeToLowerTimeframe } from './zoom/zoom.js';


console.log(`__..--..`.repeat(10))

const chartContainer = document.getElementById('tvchart');
const chart = LightweightCharts.createChart(chartContainer, cfg.chartProperties);



const throttleInterval = 2000; // Throttle interval in milliseconds

const throttledGetHistoryCandles = asyncThrottle(getHistoryCandles, throttleInterval);
const throttledPreLoadHistoryCandles = asyncThrottle(preLoadHistoryCandles, throttleInterval);
const throttledGetHistoryLines = asyncThrottle(getHistoryLines, throttleInterval);
const throttledPreLoadHistoryLines = asyncThrottle(preLoadHistoryLines, throttleInterval);

const onVisibleLogicalRangeChangedThrottled = asyncThrottle(onVisibleLogicalRangeChanged, throttleInterval);


// Applying global chart options
chart.applyOptions({
  localization: {
    priceFormatter: cfg.myPriceFormatter,
  },
});

const seriesTypesAndConfigs = [
  { key: 'candles_series', type: 'candlestick', config: cfg.candleSeriesConfig },
  { key: 'volume_series', type: 'histogram', config: cfg.volumeSeriesConfig },
  { key: 'extrema_series', type: 'line', config: cfg.lineSeriesConfig },
  { key: 'wave_series', type: 'line', config: cfg.waveSeriesConfig },
  { key: 'trend_series', type: 'line', config: cfg.trendLineSeriesConfig },
  { key: 'breaktrend_series', type: 'line', config: cfg.breakTrendLineSeriesConfig },
  { key: 'ranges_series', type: 'line', config: cfg.rangesSeriesConfig },
  { key: 'historycandles_series', type: 'candlestick', config: cfg.candleSeriesConfig },
  { key: 'historyvolume_series', type: 'histogram', config: cfg.candleSeriesConfig },
  { key: 'vma_200', type: 'line', config: cfg.vmaSeriesConfig },
  { key: 'vma_5', type: 'line', config: cfg.vmaSeriesConfig },
];

const series = seriesTypesAndConfigs.reduce((acc, { key, type, config }) => {
  acc[key] = createSeries(chart, type, config);
  return acc;
}, {});

const { symbol, timeframe } = getQueryParams();


window.addEventListener('resize', setChartSize(chart));

document.addEventListener('DOMContentLoaded', async () => {
  try {
    await initializeChartWithData(chart, series);
    await connectWebSocket(series);
    await throttledPreLoadHistoryCandles(symbol, timeframe);
    await throttledPreLoadHistoryLines(symbol, timeframe);
  } catch (error) {
    console.error('Error:', error);
    // Handle the error appropriately
  }
});

let isUpdating = false;


async function onVisibleLogicalRangeChanged(newVisibleLogicalRange) {
  if (isUpdating) return;

  isUpdating = true;
  try {
    const barsInfo = series.candles_series.barsInLogicalRange(newVisibleLogicalRange);

    // If there are less than 50 bars to the left of the visible area, load more data
    if (barsInfo !== null && barsInfo.barsBefore < 50) {
      const historicalCandles = await throttledGetHistoryCandles(symbol, timeframe);
      const fetchedCandles = await fetchCandleData(symbol, timeframe);

      const { extremum, wave, trends } = await throttledGetHistoryLines(symbol, timeframe);

      const mergedCandles = fetchedCandles ? [...historicalCandles
        .filter(candle => candle.time < fetchedCandles[0].time),
      ...fetchedCandles] : historicalCandles;

      const volumes = mergedCandles.map(({ time, volume }) => ({ time, value: volume }));
      // Calculate Volume moving average with length 200
      const VMA200 = calculateVMA(volumes, 200);
      //console.log('VMA200', VMA200);
      // Calculate Volume moving average with length 5
      const VMA5 = calculateVMA(volumes, 5);
      //console.log('VMA5', VMA5);
      if (!historicalCandles || !fetchedCandles) {
        console.error('Existing or fetched candles are nullish');
      }

      updateSeriesData(series.candles_series, mergedCandles);

      if (!volumes) { console.log('Volumes are nullish'); }
      updateSeriesData(series.volume_series, volumes);
      updateSeriesData(series.vma_200, VMA200);
      updateSeriesData(series.vma_5, VMA5);
      updateSeriesOptions(series.vma_200, { color: '#2D1FF0' });
      updateSeriesOptions(series.vma_5, { color: '#F49212' });

      series.vma_200.priceScale().applyOptions({
        scaleMargins: {
          top: 0.7,
          bottom: 0,
        },
      });

      series.vma_5.priceScale().applyOptions({
        scaleMargins: {
          top: 0.7,
          bottom: 0,
        },
      });
      series.volume_series.priceScale().applyOptions({
        scaleMargins: {
          top: 0.7,
          bottom: 0,
        },
      });

      if (!extremum || !wave || !trends) { console.log('Extremum, wave, or trends are nullish'); }

      await updateChartWithExtremaData(chart, series.extrema_series, extremum);
      await updateChartWithWaveData(chart, series.wave_series, series.candles_series, mergedCandles, wave);
      await updateChartWithTrendData(chart, mergedCandles, trends);

      const earliestVisibleTime = chart.timeScale().getVisibleRange().from;
      const startDateForFetch = getCurrentYYMMDD(earliestVisibleTime * 1000); // back to ms
      await throttledPreLoadHistoryCandles(symbol, timeframe, startDateForFetch);
      await throttledPreLoadHistoryLines(symbol, timeframe);
    }

    // Check number of visible bars and adjust timeframe if necessary
    const currentTimeframe = new URL(window.location.href).searchParams.get('timeframe');
    console.log(currentTimeframe, 'current timeframe');
    console.log(`newVisibleLgicalRange:`, newVisibleLogicalRange)
    const visibleBars = newVisibleLogicalRange.to - newVisibleLogicalRange.from + 1;

    console.log(visibleBars, 'visible bars');
    const { zoomInX, zoomOutX } = getZoomTresholds(currentTimeframe);


    if (visibleBars > zoomOutX) {
      const newTimeframe = changeToHigherTimeframe(currentTimeframe);
      if (newTimeframe !== currentTimeframe) {
        reloadPageWithNewTimeframe(newTimeframe);
      }
    } else if (visibleBars < zoomInX && visibleBars > 5) {
      const newTimeframe = changeToLowerTimeframe(currentTimeframe);
      if (newTimeframe !== currentTimeframe) {
        reloadPageWithNewTimeframe(newTimeframe);
      }
    }

  } catch (error) {
    console.error(`Error loading historical data for ${symbol} on ${timeframe}: `, error);
  } finally {
    isUpdating = false;
  }
}


chart
  .timeScale()
  .subscribeVisibleLogicalRangeChange(
    onVisibleLogicalRangeChangedThrottled
  );


// document.getElementById('loadDataButton')
//   .addEventListener('click', async () => {
//     try {
//       const candlePreloadResult = await throttledPreLoadHistoryCandles(symbol, timeframe)
//       const linesPreloadResult = await throttledPreLoadHistoryLines(symbol, timeframe)

//       const { extremum, wave, trends } = await throttledGetHistoryLines(symbol, timeframe);

//       const historicalCandles = await throttledGetHistoryCandles(symbol, timeframe);
//       const fetchedCandles = await fetchCandleData(symbol, timeframe)

//       const mergedCandles = fetchedCandles ? [...historicalCandles
//         .filter(candle => candle.time < fetchedCandles[0].time),
//       ...fetchedCandles] : historicalCandles;

//       const volumes = mergedCandles.map(({ time, volume }) => ({ time, value: volume }));
//       // calculate Volume moving average with length 200
//       const VMA200 = calculateVMA(volumes, 200);
//       // calculate Volume moving average with length 5

//       const VMA5 = calculateVMA(volumes, 5);

//       if (historicalCandles && fetchedCandles) {
//         updateSeriesData(series.candles_series, mergedCandles)
//         updateSeriesData(series.volume_series, volumes)
//         updateSeriesData(series.vma_200, VMA200)
//         updateSeriesData(series.vma_5, VMA5)
//         updateSeriesOptions(series.vma_200, { color: '#2D1FF0' })
//         updateSeriesOptions(series.vma_5, { color: '#F49212' })


//       }

//       if (extremum && wave && trends) {
//         updateChartWithExtremaData(chart, series.extrema_series, extremum)
//         updateChartWithWaveData(chart, series.wave_series, series.candles_series, mergedCandles, wave);
//         updateChartWithTrendData(chart, mergedCandles, trends)
//       }

//       series.vma_200.priceScale().applyOptions({
//         scaleMargins: {
//           top: 0.7,
//           bottom: 0,
//         },
//       })


//       series.vma_5.priceScale().applyOptions({
//         scaleMargins: {
//           top: 0.7,
//           bottom: 0,
//         },
//       })


//       series.volume_series.priceScale().applyOptions({
//         scaleMargins: {
//           top: 0.7,
//           bottom: 0,
//         },
//       })

//     }
//     catch (error) {
//       console.error(error);
//     }

//   });

// document.getElementById('dataFile').addEventListener('change', (event) => {
//     const file = event.target.files[0];
//     if (file) handleCandleDataUpload(file, series.candles_series);
//   });

export { onVisibleLogicalRangeChanged }