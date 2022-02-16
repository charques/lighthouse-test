const puppeteer = require('puppeteer');
const lighthouse = require('lighthouse');
const lrDesktopConfig = require('lighthouse/lighthouse-core/config/lr-desktop-config');
const lrMobileConfig = require('lighthouse/lighthouse-core/config/lr-mobile-config');


const processLighthouseResults = (report) => {
  let resourceSize = [];
  report.audits['resource-summary'].details.items
    .filter(({ transferSize }) => transferSize > 0)
    .forEach(({ resourceType, transferSize }) => {
      resourceSize[resourceType] = transferSize;
    })
  return {
    resourceSize: resourceSize,
    firstContentfulPaint: report.audits['first-contentful-paint'].displayValue,
    firstMeaningfulPaint: report.audits['first-meaningful-paint'].displayValue,
    largestContentfulPaint: report.audits['largest-contentful-paint'].displayValue,
    networkRTT: report.audits['network-rtt'].displayValue,
    timeToInteractive: report.audits['interactive'].displayValue,
    speedIndex: report.audits['speed-index'].displayValue,
    performanceScore: report.categories.performance.score * 100,
    fetchTime: report.fetchTime
  };
};

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

async function gatherPerfMetrics(url, browserOptions, lighthouseConfigPreset) {
  
  // for browserOptions --> https://github.com/puppeteer/puppeteer/blob/main/docs/api.md#puppeteerlaunchoptions
  // for browserOptions.args --> https://peter.sh/experiments/chromium-command-line-switches/
  const browser = await puppeteer.launch(browserOptions);

  let lighthouseConfig = lrDesktopConfig;
  if(lighthouseConfigPreset && lighthouseConfigPreset == "lr-desktop") {
    lighthouseConfig = lrDesktopConfig;
  }
  else if(lighthouseConfigPreset && lighthouseConfigPreset == "lr-mobile") {
    lighthouseConfig = lrMobileConfig;
  }

  const page = await browser.newPage();
  await page.goto(url);

  //const result = await lighthouse(url, lighthouseFlags, lighthouseConfig);
  const lighthouseMetrics = await gatherLighthouseMetrics(page, lighthouseConfig);
  const timingMetrics = await gatherPerformanceTimingMetrics(page);

  await browser.close();
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
exports.processLighthouseResults = processLighthouseResults;