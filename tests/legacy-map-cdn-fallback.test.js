const assert = require('assert');
const { readText } = require('./test-utils');

const mapHtml = readText('public/legacy/organic-map.html');

assert.ok(
  mapHtml.includes('unpkg.com/3d-force-graph@1.73.1/dist/3d-force-graph.min.js'),
  'Expected legacy map HTML to include the primary 3d-force-graph CDN.',
);

assert.ok(
  !mapHtml.includes('document.write('),
  'Expected legacy map HTML to avoid document.write-based CDN fallbacks.',
);

assert.ok(
  mapHtml.includes('unpkg.com/3d-force-graph@1.73.1/dist/3d-force-graph.min.js'),
  'Expected legacy map HTML to include explicit 3d-force-graph loading.',
);

assert.ok(
  !mapHtml.includes('build/three.min.js'),
  'Expected legacy map HTML to avoid explicit global THREE loading.',
);

assert.ok(
  !mapHtml.includes('three-spritetext'),
  'Expected legacy map HTML to avoid explicit three-spritetext loading.',
);

assert.ok(
  mapHtml.includes('id="staticMapPreview"'),
  'Expected legacy map HTML to include a static preview fallback so the screen is never blank.',
);

console.log('Verified legacy map HTML includes CDN fallback loaders.');
