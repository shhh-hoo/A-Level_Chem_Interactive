const assert = require('assert');
const { readText } = require('./test-utils');

const srcDataFile = readText('src/js/data.js');
const publicDataFile = readText('public/js/data.js');

const assertGlobalAssignment = (label, contents) => {
  assert.ok(
    contents.includes('window.OrganicMapData = organicMapData;'),
    `${label} data file must assign window.OrganicMapData for browser runtime.`,
  );
  assert.ok(
    contents.includes("if (typeof window !== 'undefined')"),
    `${label} data file must guard window assignment for Node test runtime.`,
  );
  assert.ok(
    contents.includes("if (typeof module !== 'undefined' && module.exports)"),
    `${label} data file must preserve CommonJS export for test imports.`,
  );
};

assertGlobalAssignment('src', srcDataFile);
assertGlobalAssignment('public', publicDataFile);

console.log('Verified map data files expose OrganicMapData in both browser and Node runtimes.');
