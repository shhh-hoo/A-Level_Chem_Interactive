const assert = require('assert');
const srcData = require('../src/js/data');
const legacyData = require('../public/legacy/js/data');
const { readText } = require('./test-utils');

const isNonEmptyString = (value) => typeof value === 'string' && value.trim().length > 0;
const FALLBACK_NODE_TOPIC = 'Organic chemistry';
const FALLBACK_LINK_CONDITIONS = 'Structural relationship between compound classes.';

const PRIORITY_NODE_IDS = [
  'Crude',
  'Alkane',
  'Alkene',
  'Halo',
  'AlcoholGroup',
  'Alc1',
  'Alc2',
  'Ald',
  'Ket',
  'Carb',
];

const PRIORITY_LINK_KEYS = [
  'Crude|Alkane|Cracking',
  'Crude|Alkene|Cracking',
  'Alkane|Halo|Free Radical Sub',
  'Alkene|Halo|Electrophilic Add',
  'Alkene|AlcoholGroup|Hydration',
  'Halo|AlcoholGroup|Nuc Sub',
  'Halo|Alkene|Elimination',
  'Alc1|Ald|Oxidation',
  'Alc2|Ket|Oxidation',
  'Ald|Carb|Oxidation',
  'Ald|Alc1|Reduction',
  'Ket|Alc2|Reduction',
  'AlcoholGroup|Alkene|Dehydration',
];

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

const getLinkKey = (link) => `${link.source}|${link.target}|${link.label}`;

const assertPriorityMetadataCoverage = (gData, label) => {
  const nodesById = new Map(gData.nodes.map((node) => [node.id, node]));
  PRIORITY_NODE_IDS.forEach((id) => {
    const node = nodesById.get(id);
    assert.ok(node, `${label} is missing priority node "${id}".`);
    assert.notStrictEqual(
      node.topic,
      FALLBACK_NODE_TOPIC,
      `${label} node "${id}" still uses fallback topic.`,
    );
    assert.ok(
      Array.isArray(node.examTips) && node.examTips.length > 0,
      `${label} node "${id}" must include authored exam tips.`,
    );
  });

  const linksByKey = new Map(gData.links.map((link) => [getLinkKey(link), link]));
  PRIORITY_LINK_KEYS.forEach((key) => {
    const link = linksByKey.get(key);
    assert.ok(link, `${label} is missing priority link "${key}".`);
    assert.notStrictEqual(
      link.conditions,
      FALLBACK_LINK_CONDITIONS,
      `${label} link "${key}" still uses fallback conditions.`,
    );
    assert.notStrictEqual(
      link.mechanismSummary,
      link.type,
      `${label} link "${key}" still uses fallback mechanism summary.`,
    );
    assert.ok(link.quizData, `${label} link "${key}" must include quizData.`);
    assert.ok(link.animationId, `${label} link "${key}" must include animationId.`);
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
  assertPriorityMetadataCoverage(gData, label);
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
