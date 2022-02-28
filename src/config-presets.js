const lrDesktopConfig = require('lighthouse/lighthouse-core/config/lr-desktop-config');
const lrMobileConfig = require('lighthouse/lighthouse-core/config/lr-mobile-config');

let NETWORK_PRESETS = {
  '3g': {'up':768, 'down':1600, 'rtt':150},
  '3gfast': {'up':768, 'down':1600, 'rtt':75},
  '3gslow': {'up':400, 'down':400, 'rtt':200},
  '2g': {'up':256, 'down':280, 'rtt':400},
  'cable': {'up':1000, 'down':5000, 'rtt':14},
  'dsl': {'up':384, 'down':1500, 'rtt':14},
  '3gem': {'up':400, 'down':400, 'rtt':200},
  '4g': {'up':9000, 'down':9000, 'rtt':85},
  'lte': {'up':12000, 'down':12000, 'rtt':35},
  'edge': {'up':200, 'down':240, 'rtt':35},
  'dial': {'up':30, 'down':49, 'rtt':60},
  'fois': {'up':5000, 'down':20000, 'rtt':2}
};

let LIGHTHOUSE_PRESETS = {
  'lr-desktop': lrDesktopConfig,
  'lr-mobile': lrMobileConfig
};

function getNetworkThrottlePreset(presetId) {
  return NETWORK_PRESETS[presetId] ? NETWORK_PRESETS[presetId] : null;
};

function getLighthousePreset(presetId) {
  return LIGHTHOUSE_PRESETS[presetId] ? LIGHTHOUSE_PRESETS[presetId] : lrDesktopConfig;
}

exports.getNetworkThrottlePreset = getNetworkThrottlePreset;
exports.getLighthousePreset = getLighthousePreset;