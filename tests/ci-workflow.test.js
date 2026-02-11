const assert = require('assert');
const { readText } = require('./test-utils');

const workflow = readText('.github/workflows/tests.yml');

assert.ok(
  workflow.includes('node --test tests/*.test.js'),
  'Expected CI workflow to run all Node tests with the built-in test runner.',
);

assert.ok(
  !workflow.includes('for test_file in tests/*.test.js; do'),
  'Expected CI workflow to stop using a manual shell loop for Node tests.',
);

assert.ok(
  !workflow.includes('node tests/paths.test.js'),
  'Expected CI workflow to avoid legacy single-file Node test commands in this step.',
);

console.log('Verified CI workflow uses node --test for repository Node tests.');
