const fs = require('fs');
const yargs = require('yargs/yargs');
const lighthouseRunner = require('./lighthouse-runner');
const reportUtils = require('./report-util');

// -----------------------------------------------------

let args = process.argv.slice(2);
var argvs = yargs(args)
  .usage('Usage: node index.js --testPlan [str] --assetFilterRegEx [str]')
  .demandOption(['testPlan'])
  .argv;

//"assetFilterRegEx": "index-page-jumbotron-img.png*",

let testPlanFile = argvs.testPlan;
let assetFilterRegEx = argvs.assetFilterRegEx;

let testPlanRawdata = fs.readFileSync(testPlanFile);
let testPlanObj = JSON.parse(testPlanRawdata);

reportUtils.createReportFolders(testPlanObj.url);

console.log("!!----------------------------------------------------------------------------------");
console.log("- TestPlan: " + JSON.stringify(testPlanObj));
(async function tests() {

  let resultsArray = [];
  for(let i = 1;i <= testPlanObj.iterations; i++) {
    let results = await lighthouseRunner.lighthouseFromPuppeteer(
      testPlanObj.url, 
      testPlanObj.browserOptions, 
      testPlanObj.lighthouseConfigPreset, 
      assetFilterRegEx);
    resultsArray.push(results.lhr);

    console.log("- Test " + i + " - Completed");
    reportUtils.saveIndividualLighthouseReport(testPlanObj, results);
  }
  const processedResults = reportUtils.saveMedianLighthouseReport(testPlanObj, resultsArray);
  console.log("- Test Summary")
  console.log(JSON.stringify(processedResults, null, ' '));
  console.log("!!----------------------------------------------------------------------------------");

}());