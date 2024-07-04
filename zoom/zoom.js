
const timeframes = ['1m', '5m', '15m', '1h', '4h', '1d'];


function getCurrentTimeframeIndex(currentTimeframe) {
    return timeframes.indexOf(currentTimeframe);
}

function changeToHigherTimeframe(currentTimeframe) {
    const currentIndex = getCurrentTimeframeIndex(currentTimeframe);
    if (currentIndex < timeframes.length - 1) {
        return timeframes[currentIndex + 1];
    }
    return currentTimeframe; // Return current timeframe if already at highest
}

function changeToLowerTimeframe(currentTimeframe) {
    const currentIndex = getCurrentTimeframeIndex(currentTimeframe);
    if (currentIndex > 0) {
        return timeframes[currentIndex - 1];
    }
    return currentTimeframe; // Return current timeframe if already at lowest
}

function reloadPageWithNewTimeframe(newTimeframe) {
    const url = new URL(window.location.href);
    url.searchParams.set('timeframe', newTimeframe);
    window.location.href = url.toString();
}

function timeframeToMinutes(timeframe) {
    const unit = timeframe.slice(-1);
    const value = parseInt(timeframe.slice(0, -1), 10);

    switch (unit) {
        case 'm':
            return value;
        case 'h':
            return value * 60;
        case 'd':
            return value * 60 * 24;
        default:
            throw new Error(`Unknown timeframe unit: ${unit}`);
    }
}

function getZoomTresholds(currentTimeframe) {
    const baseCandlesVisible = 700;
    let zoomInX, zoomOutX;

    const currentIndex = timeframes.indexOf(currentTimeframe);
    const nextIndex = currentIndex + 1;
    const prevIndex = currentIndex - 1;

    let nextTimeframe = timeframes[nextIndex];
    if (nextIndex === timeframes.length) {
        nextTimeframe = timeframes[currentIndex];
    }

    let prevTimeframe = timeframes[prevIndex];
    if (prevIndex === -1) {
        prevTimeframe = timeframes[currentIndex];
    }

    const currentMinutes = timeframeToMinutes(currentTimeframe);

    const nextMinutes = timeframeToMinutes(nextTimeframe);
    const prevMinutes = timeframeToMinutes(prevTimeframe);

    const zoomInMultiplier = currentMinutes / prevMinutes;
    const zoomOutMultiplier = nextMinutes / currentMinutes;

    zoomInX = Math.min((baseCandlesVisible / zoomInMultiplier), 50);
    zoomOutX = Math.min((baseCandlesVisible * zoomOutMultiplier), 3000); //baseCandlesVisible * zoomOutMultiplier ;

    console.log('zoomInX', zoomInX, 'zoomOutX', zoomOutX)
    return { zoomInX, zoomOutX };
}


export { changeToHigherTimeframe, changeToLowerTimeframe, reloadPageWithNewTimeframe, getZoomTresholds }