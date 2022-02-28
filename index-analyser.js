const fs = require('fs');
const yargs = require('yargs/yargs');
const testRunner = require('./src/test-runner');

let args = process.argv.slice(2);
var argvs = yargs(args)
  .usage('Usage: node index-analyser.js --testResultsDir [str] --fileNameFilter [str] --formFactor [desktop|mobile]')
  .demandOption(['testResultsDir', 'fileNameFilter'])
  .argv;

let testResultFolder = argvs.testResultsDir;
let fileNameFilter = argvs.fileNameFilter;
let formFactor = (argvs.formFactor) ? argvs.formFactor : 'desktop';

// read folder and filter files
let folderItems = fs.readdirSync(testResultFolder);
let filteredFiles = folderItems.filter((value) => {
  return value.indexOf(fileNameFilter) == 0 ? true : false;
});

// read files
let resultDataUnprocessed = [];
for(let i = 0; i < filteredFiles.length; i++) {
  let fileData = fs.readFileSync(testResultFolder + filteredFiles[i]);
  resultDataUnprocessed.push(JSON.parse(fileData));
}
let fResultDataUnprocessed = resultDataUnprocessed.filter((value) => {
  return value['configSettings']['formFactor'] == formFactor;
});


let computedMedian = testRunner.computeMedianRunLighthouse(fResultDataUnprocessed);

console.log(computedMedian);