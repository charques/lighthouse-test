const fs = require('fs');
const yargs = require('yargs/yargs');
const testRunner = require('./test-runner');
const reportUtils = require('./report-util');

let args = process.argv.slice(2);
var argvs = yargs(args)
  .usage('Usage: node index.js --testPlan [str]')
  .demandOption(['testPlan'])
  .argv;

let testPlanFile = argvs.testPlan;
let testPlanRawdata = fs.readFileSync(testPlanFile);
let testPlanObj = JSON.parse(testPlanRawdata);
reportUtils.createReportFolders(testPlanObj.url);

(async function tests() {
  console.log("!!----------------------------------------------------------------------------------");
  console.log("Running lighthouse test plan: " + JSON.stringify(testPlanObj));
  let lighthouseIndividualResults = [];
  let timingIndividualResults = [];
  for(let i = 1;i <= testPlanObj.iterations; i++) {
    let perfMetricsResult = await testRunner.gatherPerfMetrics(
      testPlanObj.url, 
      testPlanObj.browserOptions, 
      testPlanObj.lighthouseConfigPreset);
    
    lighthouseIndividualResults.push(perfMetricsResult.lighthouseMetricsBulk.lhr);
    timingIndividualResults.push(perfMetricsResult.timingMetricsProcessed);
    reportUtils.saveIndividualLighthouseReport(testPlanObj, perfMetricsResult.lighthouseMetricsProcessed, perfMetricsResult.lighthouseMetricsBulk);
    reportUtils.saveIndividualTimingReport(testPlanObj, perfMetricsResult.timingMetricsProcessed);
  }
  reportUtils.saveMedianLighthouseReport(testPlanObj, lighthouseIndividualResults, timingIndividualResults);
  
}());