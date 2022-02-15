const fs = require('fs');
const {computeMedianRun} = require('lighthouse/lighthouse-core/lib/median-run.js');

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

const processLighthouseResults = (report) => {
  const resourceSize = {};

  report.audits['resource-summary'].details.items
    .filter(({ transferSize }) => transferSize > 0)
    .forEach(({ resourceType, transferSize }) => {
      resourceSize[resourceType] = transferSize;
    });

  const firstContentfulPaint = report.audits['first-contentful-paint'].displayValue;
  const firstMeaningfulPaint = report.audits['first-meaningful-paint'].displayValue;
  const largestContentfulPaint = report.audits['largest-contentful-paint'].displayValue;
  const networkRTT = report.audits['network-rtt'].displayValue;
  const timeToInteractive = report.audits['interactive'].displayValue;
  const speedIndex = report.audits['speed-index'].displayValue;
  const performanceScore = report.categories.performance.score * 100;
  
  return {
    resourceSize,
    firstContentfulPaint,
    firstMeaningfulPaint,
    largestContentfulPaint,
    networkRTT,
    timeToInteractive,
    speedIndex,
    performanceScore
  };
};

const saveIndividualLighthouseReport = (testPlan, report) => {
  const dirName = getDirname(testPlan.url);

  fs.writeFile(
    `${dirName}/${report.lhr["fetchTime"].replace(/:/g, "_")}.json`,
    report.report,
    err => {
      if (err) throw err;
    }
  );
};

const saveMedianLighthouseReport = (testPlan, reportArray) => {
  const median = computeMedianRun(reportArray);
  const date = (new Date()).toLocaleString().replace(/:/g, "_").replace(/\//g, "_");
  
  const results = {};
  results.processedResults = processLighthouseResults(median);
  results.date = date;
  results.testPlan = testPlan;

  const dirName = getDirname(testPlan.url);
  fs.writeFile(
    `${dirName}/summary-${date}.json`,
    JSON.stringify(results, null, ' '),
    err => {
      if (err) throw err;
    }
  );

  return results;
}

exports.createReportFolders = createReportFolders;
exports.processLighthouseResults = processLighthouseResults;
exports.saveIndividualLighthouseReport = saveIndividualLighthouseReport;
exports.saveMedianLighthouseReport = saveMedianLighthouseReport;