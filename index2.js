const fs = require('fs');
const yargs = require('yargs/yargs');
const puppeteer = require('puppeteer');
const lighthouse = require('lighthouse');
const {computeMedianRun} = require('lighthouse/lighthouse-core/lib/median-run.js');
const REPORTS_LOCATION = "reports";

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

const urlPatterns = [
  '*'
]

async function intercept(page, patterns) {
  const client = await page.target().createCDPSession();

  await client.send("Fetch.enable", {
    patterns: patterns.map(pattern => ({
      urlPattern: pattern, resourceType: 'Image', interceptionStage: 'HeadersReceived'
    }))
  });

  client.on("Fetch.requestPaused", async event => {
    const { requestId } = event;
    //console.log(`Request "${requestId}" paused.`);

    const regex = new RegExp(/index-page-jumbotron-img.png*/);
    if(regex.test(event.request.url)) {
      const errorReason = "Failed";
      await client.send("Fetch.failRequest", { requestId, errorReason });
    }
    else {
      await client.send("Fetch.continueRequest", { requestId });
    }
  });

}

async function lighthouseFromPuppeteer(url, browserOptions) {
  // Use Puppeteer to launch headful Chrome and don't use its default 800x600 viewport.
  const browser = await puppeteer.launch(browserOptions);

  browser.on('targetcreated', async (target) => {
    const page = await target.page();
    if(page) {
      intercept(page, urlPatterns);
    }
  });

  // Lighthouse will open the URL.
  const result = await lighthouse(url, {
    port: (new URL(browser.wsEndpoint())).port,
    output: 'json',
    //logLevel: 'info',
  });

  await browser.close();
  return result;
};

// -----------------------------------------------------

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

const BROWSER_OPTIONS = {
  headless: true, 
  defaultViewport: null,
  devtools: true,
  args: ['--window-size=1920,1170','--window-position=0,0']
};

console.log("url: " + url + " -- numberOfTests: " + numberOfTests);
(async function tests() {

  for(let i = 1;i <= numberOfTests; i++) {
    let results = await lighthouseFromPuppeteer(url, BROWSER_OPTIONS);
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