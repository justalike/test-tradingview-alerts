import { updateSeriesData, processTimeFrames, getQueryParams} from '../utils/utils.js'; 
import {isValidExtremaData, isValidWaveData } from '../utils/validation.js';
import {fetchCandleData, fetchAllLineData} from '../api/dataService.js';


var lastCandle;
var fetchedCandles;
export const initializeChartWithData = async (chart, series,  sym = 'BTC/USDT', tf = '1h')  => {
   try{

    const { symbol, timeframe } = await getQueryParams();
  
    const qsymbol = symbol || sym;
    const qtimeframe = timeframe || tf;

    if (!qsymbol || !qtimeframe) {
        console.error('None symbol or timeframe set in query. \n Initializing BTCUSDT/1h chart');
    }

    //Get data required to fill the chart
    const candles = await fetchCandleData(qsymbol, qtimeframe);
    const {extremum, wave, trends} = await fetchAllLineData(qsymbol, qtimeframe);
  
   const dataSources = {
            candles: candles,
            extrema: extremum, 
            waves:   wave,
            trends:  trends,
  };
  

   for (const [name, data] of Object.entries(dataSources)) {
       if (!data) {
           console.error('Failed to fetch data from source ' + name);
          // return;
       }

       if (name === 'candles') {
        fetchedCandles = data
        lastCandle = data[data.length - 1];
        const volData = data.map(({ time, volume }) => ({ time: time, value:volume }));
        
        series.volume_series.priceScale().applyOptions({
            scaleMargins: {
                top: 0.7,
                bottom: 0,
            },
        })

        updateSeriesData(series.candles_series, data)
        updateSeriesData(series.volume_series, volData )
           //updateCandleSeries(data);
    //    } else if (name === 'extrema') {
       
    //        updateChartWithExtremaData(chart, series.extrema_series, data);
    //    } else if (name === 'waves') {
      
    //      updateChartWithWaveData(chart, series.wave_series, data);
    //    } else if (name === 'trends') {
       
    //        updateChartWithTrendData(chart, /*series.trend_series, series.ranges_series, series.breaktrend_series,*/ data);
    //    }
   }
  
  chart.applyOptions({
      watermark: {
          visible: true,
          fontSize: 52,
          horzAlign: 'center',
          vertAlign: 'top',
          color: 'rgba(255, 255, 255, 0.7)',
          text: `${qsymbol}:${qtimeframe}`,
      },
  });
   
    
  } catch (error) {
    console.error('Error initializing chart with data:', error);
  }
}
   
export function updateChartWithExtremaData(chart, series, data) {
    if (!data.every(item => isValidExtremaData(item))) {
        console.log('Invalid extrema data');
        return;
    }

    data.sort((a, b) => a.timestamp - b.timestamp);

    const lineData = data.map(item => ({
        time: item.timestamp / 1000,
        value: item.value,
    }));

    const uniqueLineData = lineData.reduce((acc, cur) => {
        if (!acc.some(item => item.time === cur.time)) {
            acc.push(cur);
        }
        return acc;
    }, []);

    updateSeriesData(series, uniqueLineData);
  

    const markersData = data.map(item => ({
        time: item.timestamp / 1000,
        position: item.type === 'maximum' ? 'aboveBar' : 'belowBar',
        color: item.type === 'maximum' ? 'red' : 'blue',
        shape: 'circle',
    }));

    series.setMarkers(markersData);
}

export function updateChartWithWaveData(chart, waveseries, data) {
    // if (!data.every(item => isValidWaveData(item))) {
    //     console.log('Invalid wave data');
    //     return;
    // }

    const validData = data.filter(item => isValidWaveData(item));

    const processedData = processTimeFrames(validData).flatMap(wave => ({
        time: wave.start / 1000,
        value: wave.startValue,
        color: wave.startValue < wave.endValue ? 'green' : 'red',
    }));
    updateSeriesData(waveseries, processedData)
    
}
  
/**
 * Updates the chart with trend data, including drawing trend lines and ranges.
 * @param {Object} chart - The chart instance to update.
 * @param {Array} data - The trend data to use for updating the chart.
 */

export function updateChartWithTrendData(chart, data) {

// We have to create new series for each trend lines we are pushing. otherwise it wont work
// because it tries to connect dots {}'s between each trend line / range / breaktrend
    data.forEach((trend, index) => {
     // console.log(trend)
      if (!trend.startTrend || !trend.endTrend ||
        !trend.startTrend.timestamp || !trend.endTrend.timestamp ||
        !trend.breakTrend.timestamp || !trend.breakTrend.value ||
        typeof trend.startTrend.value !== 'number' || typeof trend.endTrend.value !== 'number' || typeof trend.breakTrend.value !== 'number') {
      console.log('Missing or invalid data for trend:', trend);
      return;
    }
         let trendLineSeries = chart.addLineSeries({
            color: trend.direction == "U" ? 'white' : 'yellow', // Set color based on direction
            lineWidth: 2,
            priceLineVisible: false,
            crosshairMarkerVisible: false,
        });
  
         let breakTrendLineSeries = chart.addLineSeries({
            color: trend.direction == "U" ? 'white' : 'yellow',
            lineWidth: 2,
            lineStyle: 2,
            lastValueVisible: false,
            priceLineVisible: false,
            crosshairMarkerVisible: false,
            overlay: true
          })
  
          let rangesSeries = chart.addLineSeries({
            color: trend.direction === "U" ? 'lime' : 'red',
            lineWidth: 2,
            lineStyle: 1,
            lastValueVisible: false,
            priceLineVisible: false,
            crosshairMarkerVisible: false,
            overlay: true
          })
  
           rangesSeries.setData([
            { time: trend.startTrend.timestamp / 1000, value: trend.maxVolumeZone.startPrice },
            { time: trend.startTrend.timestamp / 1000, value: trend.maxVolumeZone.endPrice},
            { time: trend.endTrend?.timestamp / 1000, value: trend.maxVolumeZone.endPrice},
            { time: trend.endTrend?.timestamp / 1000, value: trend.maxVolumeZone.startPrice},
            { time: trend.startTrend?.timestamp / 1000, value: trend.maxVolumeZone.startPrice},
        ]);
  
        // Set the data for the trend line series
        trendLineSeries.setData([
            { time: trend.startTrend.timestamp / 1000, value: trend.startTrend.value },
            { time: trend.endTrend?.timestamp / 1000, value: trend.endTrend?.value },
        ]);
  
          let nextTrendEndTime;
  
          if (index === data.length - 1) {
              // If it's the last trend, use the last candle timestamp
              nextTrendEndTime = lastCandle.time
          }
          else if (trend.breakTrend.timestamp > trend.endTrend.timestamp){
              // if breaktrend is further than the endTrend extremum
            nextTrendEndTime = data[index+1].endTrend.timestamp / 1000
          }
          
          else {
              // Otherwise, use the end time of the next trend
            
              nextTrendEndTime =  trend.endTrend.timestamp / 1000;
          }
          
  
  
          breakTrendLineSeries.setData([
          { time: trend.breakTrend.timestamp / 1000, value: trend.breakTrend.value },
          { time: nextTrendEndTime, value: trend.breakTrend.value },
        ])
  
          let endTrendMarkerPos = trend.direction == "D" ? 'belowBar' : 'aboveBar';
          let startTrendMarkerPos = trend.direction == "D"  ? 'aboveBar' : 'belowBar';
        // Set the markers on the trend line series
        trendLineSeries.setMarkers([
            { time: trend.startTrend.timestamp / 1000, position: endTrendMarkerPos, color: 'yellow', shape: 'square', text: trend.startTrend.value},
            { time: trend.endTrend?.timestamp / 1000, position: startTrendMarkerPos, color: 'yellow', shape: 'square', text: trend.endTrend?.value},
          ])
    });
  }      


