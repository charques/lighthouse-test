const fs = require('fs');
const yargs = require('yargs/yargs');
const lighthouse = require('lighthouse');
const chromeLauncher = require('chrome-launcher');
const {computeMedianRun} = require('lighthouse/lighthouse-core/lib/median-run.js');

const REPORTS_LOCATION = "reports"

function launchChromeAndRunLighthouse(url, flags = {}, config = null) {
  return chromeLauncher.launch(flags).then(chrome => {
    flags.port = chrome.port;
    return lighthouse(url, flags, config).then(results =>
      chrome.kill().then(() => results));
  });
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
  
  return {resourceSize,
    firstContentfulPaint,
    firstMeaningfulPaint,
    largestContentfulPaint,
    networkRTT,
    timeToInteractive,
    speedIndex,
    performanceScore};
};

const flags = {
  chromeFlags: ['--headless',"--no-sandbox"],
  onlyCategories: ['performance']
};

let config = {
  extends: 'lighthouse:default',
  settings: {
    maxWaitForFcp: 30000,
    maxWaitForLoad: 45000,
    formFactor: "mobile",
    throttling: {
      rttMs: 150,
      throughputKbps: 1638.4,
      requestLatencyMs: 562.5,
      downloadThroughputKbps: 1474.5600000000002,
      uploadThroughputKbps: 675,
      cpuSlowdownMultiplier: 4,
    },
    throttlingMethod: "simulate"
  },
};

//,disableStorageReset: false

let args = process.argv.slice(2);
var argvs = yargs(args)
  .usage('Usage: node index.js --numberOfTests [num] --url [str]')
  .demandOption(['numberOfTests','url'])
  .argv;

let numberOfTests = argvs.numberOfTests;
let url = argvs.url;
let resultsArray = [];

const urlObj = new URL(url);
let dirName = REPORTS_LOCATION + "/" + urlObj.host.replace("www.", "");
if (urlObj.pathname !== "/") {
  dirName = dirName + urlObj.pathname.replace(/\//g, "_");
}
if (!fs.existsSync(REPORTS_LOCATION)) {
  fs.mkdirSync(REPORTS_LOCATION);
}
if (!fs.existsSync(dirName)) {
  fs.mkdirSync(dirName);
}

console.log("url: " + url + " -- numberOfTests: " + numberOfTests);
(async function tests() {
  for(let i =1;i <= numberOfTests; i++) {
    let results = await launchChromeAndRunLighthouse(url, flags, config);
    resultsArray.push(results.lhr);

    console.log("test " + i + " - completed");
    fs.writeFile(
      `${dirName}/${results.lhr["fetchTime"].replace(/:/g, "_")}.json`,
      results.report,
      err => {
        if (err) throw err;
      }
    );
  }
  
  const median = computeMedianRun(resultsArray);
  const date = (new Date()).toLocaleString().replace(/:/g, "_").replace(/\//g, "_");
  const processedResults = processLighthouseResults(median);
  processedResults.date = date;
  processedResults.testPlan = "url: " + url + " -- numberOfTests: " + numberOfTests;

  fs.writeFile(
    `${dirName}/summary-${date}.json`,
    JSON.stringify(processedResults, null, ' '),
    err => {
      if (err) throw err;
    }
  );
  
  console.log(processedResults);
}());
