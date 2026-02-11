const assert = require('assert');
const srcData = require('../src/js/data');
const legacyData = require('../public/legacy/js/data');
const { readText } = require('./test-utils');

const isNonEmptyString = (value) => typeof value === 'string' && value.trim().length > 0;

const assertNodeMetadata = (node, label) => {
  assert.ok(
    node.level === 'AS' || node.level === 'A2',
    `${label} node "${node.id}" must include level (AS/A2).`,
  );
  assert.ok(isNonEmptyString(node.topic), `${label} node "${node.id}" must include topic.`);
  assert.ok(
    Array.isArray(node.examTips),
    `${label} node "${node.id}" must include examTips array.`,
  );
};

const assertLinkMetadata = (link, label) => {
  assert.ok(
    isNonEmptyString(link.conditions),
    `${label} link "${link.source}->${link.target}" must include conditions.`,
  );
  assert.ok(
    isNonEmptyString(link.mechanismSummary),
    `${label} link "${link.source}->${link.target}" must include mechanismSummary.`,
  );

  const validQuiz =
    link.quizData === null ||
    link.quizData === undefined ||
    (isNonEmptyString(link.quizData.prompt) &&
      Array.isArray(link.quizData.hiddenFields) &&
      isNonEmptyString(link.quizData.answer));

  assert.ok(validQuiz, `${label} link "${link.source}->${link.target}" has invalid quizData.`);
  assert.ok(
    link.animationId === null || link.animationId === undefined || isNonEmptyString(link.animationId),
    `${label} link "${link.source}->${link.target}" has invalid animationId.`,
  );
};

const assertNoOrphans = (gData, label) => {
  const connected = new Set();
  gData.links.forEach((link) => {
    connected.add(link.source);
    connected.add(link.target);
  });

  gData.nodes.forEach((node) => {
    assert.ok(connected.has(node.id), `${label} node "${node.id}" is orphaned.`);
  });
};

const datasets = [
  ['src', srcData.gData],
  ['legacy', legacyData.gData],
];

datasets.forEach(([label, gData]) => {
  gData.nodes.forEach((node) => assertNodeMetadata(node, label));
  gData.links.forEach((link) => assertLinkMetadata(link, label));
  assertNoOrphans(gData, label);
});

const srcNodeIds = new Set(srcData.gData.nodes.map((node) => node.id));
const legacyNodeIds = new Set(legacyData.gData.nodes.map((node) => node.id));
assert.deepStrictEqual(
  Array.from(srcNodeIds).sort(),
  Array.from(legacyNodeIds).sort(),
  'src and legacy node sets should stay aligned.',
);

const hasNodeTips = srcData.gData.nodes.some((node) => node.examTips.length > 0);
assert.ok(hasNodeTips, 'Expected at least one node to include exam tips.');

const hasQuizData = srcData.gData.links.some((link) => link.quizData);
assert.ok(hasQuizData, 'Expected at least one link to include quizData.');

const hasAnimation = srcData.gData.links.some((link) => link.animationId);
assert.ok(hasAnimation, 'Expected at least one link to include animationId.');

const mapHtml = readText('public/legacy/organic-map.html');
['infoWhat', 'infoHow', 'infoWhy', 'infoExamTip'].forEach((id) => {
  assert.ok(
    mapHtml.includes(`id="${id}"`),
    `Expected legacy map panel block with id "${id}".`,
  );
});

console.log('Verified M1 metadata schema, orphan-node checks, and info panel blocks.');
