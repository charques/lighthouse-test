const fs = require('fs');
const testRunner = require('./test-runner');
const {computeMedianRun} = require('lighthouse/lighthouse-core/lib/median-run.js');

const REPORTS_LOCATION = "reports";

const computeMedianRunTiming = (timingResults) => {
  const median = (values) => {
    values.sort(function(a,b){
      return a-b;
    });
    var half = Math.floor(values.length / 2);
    
    if (values.length % 2)
      return values[half];
    else
      return (values[half - 1] + values[half]) / 2.0;
  }

  const getValuesByKey = (resultsArray, key) => {
    const values = [];
    for (var i = 0; i < resultsArray.length; i++) {
      values.push(resultsArray[i][key]);
    }
    return values;
  }

  return {
    dnsLookup: median(getValuesByKey(timingResults, 'dnsLookup')),
    tcpConnect: median(getValuesByKey(timingResults, 'tcpConnect')),
    request: median(getValuesByKey(timingResults, 'request')),
    response: median(getValuesByKey(timingResults, 'response')),
    domLoaded: median(getValuesByKey(timingResults, 'domLoaded')),
    domInteractive: median(getValuesByKey(timingResults, 'domInteractive')),
    pageLoad: median(getValuesByKey(timingResults, 'pageLoad')),
    fullTime: median(getValuesByKey(timingResults, 'fullTime'))
  }
}

const getDirname = (url) => {
  const urlObj = new URL(url);
  let dirName = REPORTS_LOCATION + "/" + urlObj.host.replace("www.", "");
  if (urlObj.pathname !== "/") {
    dirName = dirName + urlObj.pathname.replace(/\//g, "_");
  }
  return dirName;
}

const createReportFolders = (url) => {
  if (!fs.existsSync(REPORTS_LOCATION)) {
    fs.mkdirSync(REPORTS_LOCATION);
  }
  const dirName = getDirname(url);
  if (!fs.existsSync(dirName)) {
    fs.mkdirSync(dirName);
  }
}

const saveIndividualTimingReport = (testPlan, processedMetrics) => {
  const dirName = getDirname(testPlan.url);

  console.log(processedMetrics.fetchTime + " -> dnsLookup: " + processedMetrics.dnsLookup + " tcpConnect: " + processedMetrics.tcpConnect + " request: " + processedMetrics.request
  + " response: " + processedMetrics.response + " domLoaded: " + processedMetrics.domLoaded + " domInteractive: " + processedMetrics.domInteractive + " pageLoad: " + processedMetrics.pageLoad + " fullTime: " + processedMetrics.fullTime);

  fs.writeFile(
    `${dirName}/timing-${processedMetrics.fetchTime.replace(/:/g, "_")}.json`,
    JSON.stringify(processedMetrics),
    err => {
      if (err) throw err;
    }
  );
}

const saveIndividualLighthouseReport = (testPlan, processedMetrics, bulkMetrics) => {
  const dirName = getDirname(testPlan.url);

  console.log(processedMetrics.fetchTime + " -> FCP: " + processedMetrics.firstContentfulPaint + " FMP: " + processedMetrics.firstMeaningfulPaint + " LCP: " + processedMetrics.largestContentfulPaint
  + " NRTT: " + processedMetrics.networkRTT + " TTI: " + processedMetrics.timeToInteractive + " SpeedIndex: " + processedMetrics.speedIndex + " PS: " + processedMetrics.performanceScore);

  fs.writeFile(
    `${dirName}/lighthouse-${processedMetrics.fetchTime.replace(/:/g, "_")}.json`,
    bulkMetrics.report,
    err => {
      if (err) throw err;
    }
  );
};

const saveMedianLighthouseReport = (testPlan, lighthouseResultsArray, timmingResultsArray) => {
  const lighthouseMedian = computeMedianRun(lighthouseResultsArray);
  const timingMedian = computeMedianRunTiming(timmingResultsArray);
  const date = (new Date()).toLocaleString().replace(/:/g, "_").replace(/\//g, "_");
  
  const results = {};
  results.lighthouseMedianResults = testRunner.processLighthouseResults(lighthouseMedian);
  results.timingMediaResults = timingMedian;
  results.date = date;
  results.testPlan = testPlan;

  const dirName = getDirname(testPlan.url);
  fs.writeFile(
    `${dirName}/lighhouse-median-${date}.json`,
    JSON.stringify(results, null, ' '),
    err => {
      if (err) throw err;
    }
  );
  console.log("Summary: " + JSON.stringify(results, null, ' '));
  return results;
}

exports.createReportFolders = createReportFolders;
exports.saveIndividualLighthouseReport = saveIndividualLighthouseReport;
exports.saveIndividualTimingReport = saveIndividualTimingReport;
exports.saveMedianLighthouseReport = saveMedianLighthouseReport;