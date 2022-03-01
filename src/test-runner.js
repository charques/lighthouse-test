const puppeteer = require('puppeteer');
const lighthouse = require('lighthouse');
const {computeMedianRun} = require('lighthouse/lighthouse-core/lib/median-run');
const calcUtils = require('./calc-utils');
const { getNetworkThrottlePreset, getLighthousePreset } = require('./config-presets');
const throttle = require('@sitespeed.io/throttle');

const computeMedianRunLighthouse = (lighthouseResults) => {
  return processLighthouseResults(computeMedianRun(lighthouseResults))
}

const computeMedianRunTiming = (timingResults) => {
  
  const getValuesByKey = (resultsArray, key) => {
    const values = [];
    for (var i = 0; i < resultsArray.length; i++) {
      values.push(resultsArray[i][key]);
    }
    return values;
  }

  return {
    dnsLookup: calcUtils.median(getValuesByKey(timingResults, 'dnsLookup')),
    tcpConnect: calcUtils.median(getValuesByKey(timingResults, 'tcpConnect')),
    request: calcUtils.median(getValuesByKey(timingResults, 'request')),
    response: calcUtils.median(getValuesByKey(timingResults, 'response')),
    domLoaded: calcUtils.median(getValuesByKey(timingResults, 'domLoaded')),
    domInteractive: calcUtils.median(getValuesByKey(timingResults, 'domInteractive')),
    pageLoad: calcUtils.median(getValuesByKey(timingResults, 'pageLoad')),
    fullTime: calcUtils.median(getValuesByKey(timingResults, 'fullTime'))
  }
}

const processLighthouseResults = (report) => {
  return {
    resourceSize: calculateResourceSummary(report.audits['resource-summary'].details),
    firstContentfulPaint: report.audits['first-contentful-paint'].displayValue,
    firstMeaningfulPaint: report.audits['first-meaningful-paint'].displayValue,
    largestContentfulPaint: report.audits['largest-contentful-paint'].displayValue,
    networkRTT: report.audits['network-rtt'].displayValue,
    timeToInteractive: report.audits['interactive'].displayValue,
    speedIndex: report.audits['speed-index'].displayValue,
    totalBlockingTime: report.audits['total-blocking-time'].displayValue,
    cumulativeLayoutShift: report.audits['cumulative-layout-shift'].displayValue,
    networkServerLatency: report.audits['network-server-latency'].displayValue,
    serverResponseTime: report.audits['server-response-time'].displayValue,
    totalByteWeight: report.audits['total-byte-weight'].displayValue,
    resourceSummary: report.audits['resource-summary'].displayValue,
    performanceScore: report.categories.performance.score * 100,
    requestsTimings: calculateTimingPerAssetType(report.audits['network-requests'].details),
    fetchTime: report.fetchTime
  };
};

const calculateResourceSummary = (resources) => {
  let resourceSize = {};
  if(resources && resources.items) {
    resources.items.filter(({ transferSize }) => transferSize > 0)
      .forEach(({ resourceType, transferSize }) => {
        resourceSize[resourceType] = transferSize;
      })
  }
  return resourceSize;
}

const calculateTimingPerAssetType = (networkRequest, fMimeType) => {
  let timings = {};
  if(networkRequest && networkRequest.items) {
    let requests = networkRequest.items;
    let tranferTimeA = [];    
    let filtered = (fMimeType) ? requests.filter(({ mimeType }) => mimeType == fMimeType) : requests;
    filtered.forEach(({ startTime, endTime }) => {
      tranferTimeA.push(endTime - startTime);
    })
    timings['transferTimeMedian'] = calcUtils.median(tranferTimeA);
    timings['transferTimeAverage'] = calcUtils.average(tranferTimeA);
    timings['transferTimeMin'] = calcUtils.min(tranferTimeA);
    timings['transferTimeMax'] = calcUtils.max(tranferTimeA);
  }
  return timings;
}

const processTimingResults = (timingMetrics) => {
  return {
    dnsLookup: timingMetrics.domainLookupEnd - timingMetrics.domainLookupStart,
    tcpConnect: timingMetrics.connectEnd - timingMetrics.connectStart,
    request: timingMetrics.responseStart - timingMetrics.requestStart,
    response: timingMetrics.responseEnd - timingMetrics.responseStart,
    domLoaded: timingMetrics.domComplete - timingMetrics.domLoading,
    domInteractive: timingMetrics.domInteractive - timingMetrics.navigationStart,
    pageLoad: timingMetrics.loadEventEnd - timingMetrics.loadEventStart,
    fullTime: timingMetrics.loadEventEnd - timingMetrics.navigationStart,
    fetchTime: timingMetrics.fetchTime
  }
}

async function gatherPerfMetrics(url, browserOptions, lighthouseConfigPreset, throttlePresetId) {
  
  // for browserOptions --> https://github.com/puppeteer/puppeteer/blob/main/docs/api.md#puppeteerlaunchoptions
  // for browserOptions.args --> https://peter.sh/experiments/chromium-command-line-switches/
  const browser = await puppeteer.launch(browserOptions);
  const page = await browser.newPage();

  // Configure the navigation timeout
  await page.setDefaultNavigationTimeout(0);

  // throttle on
  let throttleValue = getNetworkThrottlePreset(throttlePresetId);
  if(throttleValue) {
    await throttle.start(throttleValue);
  }

  await page.goto(url);

  const lighthouseConfig = getLighthousePreset(lighthouseConfigPreset);
  const lighthouseMetrics = await gatherLighthouseMetrics(page, lighthouseConfig);
  const timingMetrics = await gatherPerformanceTimingMetrics(page);

  await browser.close();

  // throttle off
  if(throttleValue) {
    await throttle.stop();
  }

  return {
    lighthouseMetricsProcessed: processLighthouseResults(lighthouseMetrics.lhr),
    lighthouseMetricsBulk: lighthouseMetrics,
    timingMetricsProcessed: processTimingResults(timingMetrics)
  };
};

async function gatherLighthouseMetrics(page, config) {
  const port = await page.browser().wsEndpoint().split(':')[2].split('/')[0];
  const lighthouseFlags = {
    port: port,
    output: 'json'
  };
  return await lighthouse(page.url(), lighthouseFlags, config).then(results => {
    //delete results.artifacts;
    return results;
  });
}

async function gatherPerformanceTimingMetrics(page) {
  
  // The values returned from evaluate() function should be JSON serializeable.
  const rawMetrics = await page.evaluate(() => JSON.stringify(window.performance.timing));
  const metrics = JSON.parse(rawMetrics);
  metrics.fetchTime = (new Date()).toISOString();
  return metrics;
}

exports.gatherPerfMetrics = gatherPerfMetrics;
exports.computeMedianRunTiming = computeMedianRunTiming;
exports.computeMedianRunLighthouse = computeMedianRunLighthouse;
exports.processLighthouseResults = processLighthouseResults;