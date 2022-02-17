const fs = require('fs');
const REPORTS_LOCATION = "reports";

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
    JSON.stringify(processedMetrics, null, ' '),
    err => {
      if (err) throw err;
    }
  );
}

const saveIndividualLighthouseReport = (testPlan, processedMetrics, bulkMetrics) => {
  const dirName = getDirname(testPlan.url);

  console.log(processedMetrics.fetchTime + " -> FCP: " + processedMetrics.firstContentfulPaint + " FMP: " + processedMetrics.firstMeaningfulPaint + " LCP: " + processedMetrics.largestContentfulPaint
  + " NRTT: " + processedMetrics.networkRTT + " TTI: " + processedMetrics.timeToInteractive + " SpeedIndex: " + processedMetrics.speedIndex + " CLS: " + processedMetrics.cumulativeLayoutShift 
  + " TBT: " + processedMetrics.totalBlockingTime + " PS: " + processedMetrics.performanceScore);

  fs.writeFile(
    `${dirName}/lighthouse-${processedMetrics.fetchTime.replace(/:/g, "_")}.json`,
    bulkMetrics.report,
    err => {
      if (err) throw err;
    }
  );
};

const saveMedianReport = (testPlan, lighthouseResultsMedian, timmingResultsMedian) => {
  const date = (new Date()).toLocaleString().replace(/:/g, "_").replace(/\//g, "_");
  
  const results = {
    lighthouseResultsMedian,
    timmingResultsMedian,
    date,
    testPlan
  };

  const dirName = getDirname(testPlan.url);
  fs.writeFile(
    `${dirName}/median-${date}.json`,
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
exports.saveMedianReport = saveMedianReport;