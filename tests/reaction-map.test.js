const assert = require('assert');
const { gData } = require('../reaction-map-data');

const reactionLinks = gData.links;

const toKey = link => `${link.source}=>${link.label}=>${link.target}`;

const expectedPaths = [
    'AlcoholGroup=>Class=>Alc1',
    'AlcoholGroup=>Class=>Alc2',
    'AlcoholGroup=>Class=>Alc3',
    'Crude=>Cracking=>Alkane',
    'Crude=>Cracking=>Alkene',
    'Alkane=>Free Radical Sub=>Halo',
    'Alkene=>Hydrogenation=>Alkane',
    'Alkene=>Electrophilic Add=>Halo',
    'Alkene=>Hydration=>Alc1',
    'Alkene=>Hydration=>AlcoholGroup',
    'Alkene=>Mild Oxidation=>Diol',
    'Alkene=>Oxidative Cleavage=>Ket',
    'Alkene=>Oxidative Cleavage=>Carb',
    'Halo=>Elimination=>Alkene',
    'Halo=>Nuc Sub=>Alc1',
    'Halo=>Nuc Sub=>AlcoholGroup',
    'Halo=>Nuc Sub=>Amine',
    'Halo=>Nuc Sub=>Nitrile',
    'Alc1=>Oxidation=>Ald',
    'Ald=>Oxidation=>Carb',
    'Alc1=>Oxidation=>Carb',
    'Alc2=>Oxidation=>Ket',
    'Alc3=>No Reaction=>NoRxn',
    'Ald=>Reduction=>Alc1',
    'Ket=>Reduction=>Alc2',
    'Carb=>Reduction=>Alc1',
    'Alc1=>Esterification=>Ester',
    'AlcoholGroup=>Esterification=>Ester',
    'Carb=>Esterification=>Ester',
    'Nitrile=>Hydrolysis=>Carb',
    'Ester=>Hydrolysis=>Carb',
    'Ester=>Hydrolysis=>Alc1',
    'Alc1=>Dehydration=>Alkene',
    'AlcoholGroup=>Dehydration=>Alkene'
];

const actualPaths = reactionLinks.map(toKey);
const actualSet = new Set(actualPaths);

assert.strictEqual(
    reactionLinks.length,
    expectedPaths.length,
    `Expected ${expectedPaths.length} reaction paths, found ${reactionLinks.length}.`
);

assert.strictEqual(
    actualSet.size,
    expectedPaths.length,
    'Duplicate reaction paths detected in the map.'
);

expectedPaths.forEach(path => {
    assert.ok(actualSet.has(path), `Missing reaction path: ${path}`);
});

console.log('Reaction map paths are intact.');
