const assert = require('assert');
const srcData = require('../src/js/data');
const legacyData = require('../public/legacy/js/data');

const M1_AS_TARGET_SECTIONS = [13, 14, 15, 16, 17, 18, 19, 20, 21, 22];
const M1_A2_TARGET_SECTIONS = [29, 30, 31, 32, 33, 34, 35, 36, 37];
const REQUIRED_M1_SECTIONS = [...M1_AS_TARGET_SECTIONS, ...M1_A2_TARGET_SECTIONS];

const TOPIC_SECTION_EXPECTATIONS = {
  Hydrocarbons: [14, 30],
  'Halogen compounds': [15, 31],
  'Hydroxy compounds': [16, 32],
  'Carbonyl compounds': [17],
  'Carboxylic acids and derivatives': [18, 33],
  'Nitrogen compounds': [19, 34],
  Polymerisation: [20, 35],
  'Reaction limits': [21, 36],
};

const hasAnySection = (taggedSections, expectedSections) =>
  expectedSections.some((section) => taggedSections.includes(section));

const collectSectionSet = (gData) =>
  new Set([...gData.nodes, ...gData.links].flatMap((item) => item.syllabusSections || []));

const assertLevelCompatibility = (node, label) => {
  const hasAsSection = node.syllabusSections.some((section) => section <= 22);
  const hasA2Section = node.syllabusSections.some((section) => section >= 23);

  if (hasAsSection && hasA2Section) {
    assert.strictEqual(
      node.level,
      'AS/A2',
      `${label} node "${node.id}" must be level AS/A2 when tagged with both AS and A2 sections.`,
    );
  }

  if (hasAsSection && !hasA2Section) {
    assert.strictEqual(
      node.level,
      'AS',
      `${label} node "${node.id}" must be level AS when only AS sections are tagged.`,
    );
  }

  if (!hasAsSection && hasA2Section) {
    assert.strictEqual(
      node.level,
      'A2',
      `${label} node "${node.id}" must be level A2 when only A2 sections are tagged.`,
    );
  }

  if (node.level === 'AS') {
    assert.ok(
      hasAsSection,
      `${label} AS node "${node.id}" must include at least one AS section tag.`,
    );
  }

  if (node.level === 'A2') {
    assert.ok(
      hasA2Section,
      `${label} A2 node "${node.id}" must include at least one A2 section tag.`,
    );
  }

  if (node.level === 'AS/A2') {
    assert.ok(
      hasAsSection,
      `${label} AS/A2 node "${node.id}" must include at least one AS section tag.`,
    );
    assert.ok(
      hasA2Section,
      `${label} AS/A2 node "${node.id}" must include at least one A2 section tag.`,
    );
  }
};

const assertTopicCoherence = (node, label) => {
  const expectedSections = TOPIC_SECTION_EXPECTATIONS[node.topic];
  if (!expectedSections) {
    return;
  }

  assert.ok(
    hasAnySection(node.syllabusSections, expectedSections),
    `${label} node "${node.id}" topic "${node.topic}" must include one of sections: ${expectedSections.join(
      ', ',
    )}.`,
  );
};

const assertCoverageTargets = (gData, label) => {
  const sectionSet = collectSectionSet(gData);
  REQUIRED_M1_SECTIONS.forEach((section) => {
    assert.ok(sectionSet.has(section), `${label} data is missing section ${section} coverage.`);
  });
};

const datasets = [
  ['src', srcData.gData],
  ['legacy', legacyData.gData],
];

datasets.forEach(([label, gData]) => {
  const asNodes = gData.nodes.filter((node) => node.level === 'AS');
  const a2Nodes = gData.nodes.filter((node) => node.level === 'A2');
  const crossLevelNodes = gData.nodes.filter((node) => node.level === 'AS/A2');
  assert.ok(asNodes.length > 0, `${label} should include AS-only nodes.`);
  assert.ok(a2Nodes.length > 0, `${label} should include A2-only nodes.`);
  assert.ok(crossLevelNodes.length > 0, `${label} should include at least one AS/A2 cross-level node.`);
  assert.ok(
    crossLevelNodes.length <= Math.floor(gData.nodes.length / 2),
    `${label} should not classify most nodes as AS/A2; prefer explicit single-phase tags where possible.`,
  );

  gData.nodes.forEach((node) => {
    assertLevelCompatibility(node, label);
    assertTopicCoherence(node, label);
  });
  assertCoverageTargets(gData, label);
});

const srcSectionSet = collectSectionSet(srcData.gData);
const legacySectionSet = collectSectionSet(legacyData.gData);
assert.deepStrictEqual(
  Array.from(srcSectionSet).sort((a, b) => a - b),
  Array.from(legacySectionSet).sort((a, b) => a - b),
  'Expected src and legacy datasets to expose the same syllabus section coverage.',
);

console.log('Verified M1 syllabus tagging and section coverage targets.');
