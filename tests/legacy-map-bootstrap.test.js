const assert = require('assert');
const { readText } = require('./test-utils');

const srcMain = readText('src/js/main.js');
const legacyMain = readText('public/legacy/js/main.js');

const assertBootstrapGuards = (label, contents) => {
  assert.ok(
    contents.includes('function showStartupError('),
    `${label} main.js should provide a visible startup error helper.`,
  );
  assert.ok(
    contents.includes("typeof ForceGraph3D === 'undefined'"),
    `${label} main.js should guard for missing ForceGraph3D dependency.`,
  );
  assert.ok(
    !contents.includes("typeof THREE === 'undefined'"),
    `${label} main.js should avoid hard dependency guards for global THREE.`,
  );
  assert.ok(
    !contents.includes("typeof SpriteText === 'undefined'"),
    `${label} main.js should avoid hard dependency guards for global SpriteText.`,
  );
  assert.ok(
    contents.includes('Graph.width(window.innerWidth)'),
    `${label} main.js should set an explicit initial graph width.`,
  );
  assert.ok(
    contents.includes('Graph.height(window.innerHeight)'),
    `${label} main.js should set an explicit initial graph height.`,
  );
  assert.ok(
    !contents.includes('.nodeThreeObject('),
    `${label} main.js should use ForceGraph native node rendering for runtime compatibility.`,
  );
  assert.ok(
    contents.includes('Graph renderer initialization failed.'),
    `${label} main.js should expose renderer initialization failures in console output.`,
  );
  assert.ok(
    contents.includes('renderFallbackMap(mapContainer);'),
    `${label} main.js should render the built-in fallback map when 3D init fails.`,
  );
  assert.ok(
    contents.includes('function renderFallbackMap('),
    `${label} main.js should include a built-in fallback renderer for offline/CDN-failure cases.`,
  );
  assert.ok(
    contents.includes('Falling back to built-in 3D renderer.'),
    `${label} main.js should log fallback 3D renderer activation.`,
  );
  assert.ok(
    contents.includes('function hideStaticPreview()'),
    `${label} main.js should hide static HTML preview after a dynamic renderer is ready.`,
  );
  assert.ok(
    contents.includes('function rotatePoint('),
    `${label} main.js should include local 3D rotation math in fallback renderer.`,
  );
  assert.ok(
    contents.includes('function projectPoint('),
    `${label} main.js should include 3D-to-2D projection math in fallback renderer.`,
  );
  assert.ok(
    contents.includes("canvas.addEventListener('wheel'"),
    `${label} main.js should support zoom in fallback 3D renderer.`,
  );
  assert.ok(
    contents.includes("document.addEventListener('DOMContentLoaded'"),
    `${label} main.js should bootstrap map initialization on DOMContentLoaded.`,
  );
  assert.ok(
    contents.includes('window.initMap = initMap;'),
    `${label} main.js should expose initMap on window for recovery/debug bootstrap.`,
  );
  assert.ok(
    contents.includes("window.addEventListener('load', initMap, { once: true });"),
    `${label} main.js should retry map initialization on window load as a fallback.`,
  );
  assert.ok(
    contents.includes('window.__legacyMapScriptLoaded'),
    `${label} main.js should guard against duplicate script execution in the same page.`,
  );
};

assertBootstrapGuards('src', srcMain);
assertBootstrapGuards('legacy', legacyMain);

console.log('Verified legacy map bootstrap guards and explicit sizing.');
