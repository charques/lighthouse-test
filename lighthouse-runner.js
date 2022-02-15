const puppeteer = require('puppeteer');
const lighthouse = require('lighthouse');
const lrDesktopConfig = require('lighthouse/lighthouse-core/config/lr-desktop-config');
const lrMobileConfig = require('lighthouse/lighthouse-core/config/lr-mobile-config')

const urlPatterns = [
  '*'
]

async function intercept(page, patterns, filterRegEx) {
  const client = await page.target().createCDPSession();

  await client.send("Fetch.enable", {
    patterns: patterns.map(pattern => ({
      urlPattern: pattern, resourceType: 'Image', interceptionStage: 'HeadersReceived'
      //urlPattern: pattern, resourceType: 'Image', interceptionStage: 'BeforeRequest'
    }))
  });

  client.on("Fetch.requestPaused", async event => {
    const { requestId } = event;
    console.log(`Request "${requestId}" paused.`);

    const regex = new RegExp(filterRegEx);
    if(regex.test(event.request.url)) {
      const errorReason = "Failed";
      await client.send("Fetch.failRequest", { requestId, errorReason });
    }
    else {
      await client.send("Fetch.continueRequest", { requestId });
    }
  });
}

async function lighthouseFromPuppeteer(url, browserOptions, lighthouseConfigPreset, filterRegEx) {
  
  // https://github.com/puppeteer/puppeteer/blob/main/docs/api.md#puppeteerlaunchoptions
  // https://peter.sh/experiments/chromium-command-line-switches/
  const browser = await puppeteer.launch(browserOptions);

  let lighthouseConfig = lrDesktopConfig;
  if(lighthouseConfigPreset && lighthouseConfigPreset == "lr-desktop") {
    lighthouseConfig = lrDesktopConfig;
  }
  else if(lighthouseConfigPreset && lighthouseConfigPreset == "lr-mobile") {
    lighthouseConfig = lrMobileConfig;
  }

  if(filterRegEx && filterRegEx.lenght > 0) {
    browser.on('targetcreated', async (target) => {
      const page = await target.page();
      if(page) {
        intercept(page, urlPatterns, filterRegEx);
      }
    });
  }

  const lighthouseFlags = {
    port: (new URL(browser.wsEndpoint())).port,
    output: 'json'
  };

  const result = await lighthouse(url, lighthouseFlags, lighthouseConfig);

  await browser.close();
  return result;
};

exports.lighthouseFromPuppeteer = lighthouseFromPuppeteer;