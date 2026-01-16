const reactionMapData = (() => {
    const colors = {
        crude: '#888888',
        hc: '#ff99ff', // Alkane/Alkene
        halo: '#ffff99',
        // Updated Alcohol Colors
        alcGroup: '#ffffff', // White center for hub
        alc1: '#93c5fd', // Light Blue (Primary)
        alc2: '#3b82f6', // Medium Blue (Secondary)
        alc3: '#1e40af', // Dark Blue (Tertiary)
        carbonyl: '#ff9966', // Ald/Ket
        acid: '#ff6666', // Acid/Ester
        amine: '#34D399',
        nitrile: '#8B5CF6',
        noRxn: '#ef4444'
    };

    const gData = {
        nodes: [
            { id: 'Crude', name: 'Crude Oil', color: colors.crude, val: 20 },
            { id: 'Alkane', name: 'Alkanes', color: colors.hc, val: 10 },
            { id: 'Alkene', name: 'Alkenes', color: colors.hc, val: 10 },
            { id: 'Halo', name: 'Halogenoalkanes', color: colors.halo, val: 12 },

            { id: 'AlcoholGroup', name: 'Alcohols', color: colors.alcGroup, val: 15 },
            { id: 'Alc1', name: 'Primary Alcohol', color: colors.alc1, val: 8 },
            { id: 'Alc2', name: 'Secondary Alcohol', color: colors.alc2, val: 8 },
            { id: 'Alc3', name: 'Tertiary Alcohol', color: colors.alc3, val: 8 },

            { id: 'Ald', name: 'Aldehyde', color: colors.carbonyl, val: 8 },
            { id: 'Ket', name: 'Ketone', color: colors.carbonyl, val: 8 },
            { id: 'Carb', name: 'Carboxylic Acid', color: colors.acid, val: 10 },
            { id: 'Ester', name: 'Ester', color: colors.acid, val: 10 },
            { id: 'Amine', name: 'Amine', color: colors.amine, val: 8 },
            { id: 'Nitrile', name: 'Nitrile', color: colors.nitrile, val: 8 },
            { id: 'Diol', name: 'Diol', color: colors.alc1, val: 8 },
            { id: 'NoRxn', name: 'No Reaction', color: colors.noRxn, val: 5 }
        ],
        links: [
            // Structural Links - No particles, no arrows
            { source: 'AlcoholGroup', target: 'Alc1', label: 'Class', type: 'structure' },
            { source: 'AlcoholGroup', target: 'Alc2', label: 'Class', type: 'structure' },
            { source: 'AlcoholGroup', target: 'Alc3', label: 'Class', type: 'structure' },

            // Hydrocarbon
            { source: 'Crude', target: 'Alkane', label: 'Cracking', reagents: 'Heat + Al₂O₃', type: 'Thermal Decomposition' },
            { source: 'Crude', target: 'Alkene', label: 'Cracking', reagents: 'Heat + Al₂O₃', type: 'Thermal Decomposition' },
            { source: 'Alkane', target: 'Halo', label: 'Free Radical Sub', reagents: 'UV Light + Halogen', type: 'Free Radical Substitution' },
            { source: 'Alkene', target: 'Alkane', label: 'Hydrogenation', reagents: 'H₂ + Pt/Ni + Heat', type: 'Electrophilic Addition' },
            { source: 'Alkene', target: 'Halo', label: 'Electrophilic Add', reagents: 'Hydrogen Halide', type: 'Electrophilic Addition' },

            { source: 'Alkene', target: 'Alc1', label: 'Hydration', reagents: 'Steam + H₃PO₄', type: 'Electrophilic Addition' },
            { source: 'Alkene', target: 'AlcoholGroup', label: 'Hydration', reagents: 'Steam + H₃PO₄ + 300°C', type: 'Electrophilic Addition' },

            // Alkene Oxidation Pathways
            { source: 'Alkene', target: 'Diol', label: 'Mild Oxidation', reagents: 'Cold Dilute KMnO₄', type: 'Oxidation' },
            { source: 'Alkene', target: 'Ket', label: 'Oxidative Cleavage', reagents: 'Hot Conc. KMnO₄ / H⁺', type: 'Strong Oxidation' },
            { source: 'Alkene', target: 'Carb', label: 'Oxidative Cleavage', reagents: 'Hot Conc. KMnO₄ / H⁺', type: 'Strong Oxidation' },

            { source: 'Halo', target: 'Alkene', label: 'Elimination', reagents: 'NaOH (eth) + Heat', type: 'Elimination' },

            { source: 'Halo', target: 'Alc1', label: 'Nuc Sub', reagents: 'NaOH (aq) + Heat', type: 'Nucleophilic Substitution' },
            { source: 'Halo', target: 'AlcoholGroup', label: 'Nuc Sub', reagents: 'NaOH (aq) + Heat', type: 'Nucleophilic Substitution (SN1/SN2)' },

            { source: 'Halo', target: 'Amine', label: 'Nuc Sub', reagents: 'NH₃ (eth) + Heat + Pressure', type: 'Nucleophilic Substitution' },
            { source: 'Halo', target: 'Nitrile', label: 'Nuc Sub', reagents: 'KCN (eth) + Heat', type: 'Nucleophilic Substitution' },

            // Oxidation
            { source: 'Alc1', target: 'Ald', label: 'Oxidation', reagents: 'K₂Cr₂O₇/H⁺ (Distil)', type: 'Partial Oxidation' },
            { source: 'Ald', target: 'Carb', label: 'Oxidation', reagents: 'K₂Cr₂O₇/H⁺ (Reflux)', type: 'Full Oxidation' },
            { source: 'Alc1', target: 'Carb', label: 'Oxidation', reagents: 'Excess K₂Cr₂O₇/H⁺ (Reflux)', type: 'Full Oxidation' },
            { source: 'Alc2', target: 'Ket', label: 'Oxidation', reagents: 'K₂Cr₂O₇/H⁺ (Reflux)', type: 'Oxidation' },
            { source: 'Alc3', target: 'NoRxn', label: 'No Reaction', reagents: 'Resistant to oxidation', type: 'N/A' },

            // Reduction
            { source: 'Ald', target: 'Alc1', label: 'Reduction', reagents: 'NaBH₄ or LiAlH₄', type: 'Nucleophilic Addition' },
            { source: 'Ket', target: 'Alc2', label: 'Reduction', reagents: 'NaBH₄ or LiAlH₄', type: 'Nucleophilic Addition' },
            { source: 'Carb', target: 'Alc1', label: 'Reduction', reagents: 'LiAlH₄ (ether)', type: 'Reduction' },

            // Derivatives
            { source: 'Alc1', target: 'Ester', label: 'Esterification', reagents: 'Carboxylic Acid + H₂SO₄', type: 'Condensation' },
            { source: 'AlcoholGroup', target: 'Ester', label: 'Esterification', reagents: 'Acid + H₂SO₄', type: 'Condensation' },
            { source: 'Carb', target: 'Ester', label: 'Esterification', reagents: 'Alcohol + H₂SO₄', type: 'Condensation' },
            { source: 'Nitrile', target: 'Carb', label: 'Hydrolysis', reagents: 'Acid/Alkali + Heat', type: 'Hydrolysis' },
            { source: 'Ester', target: 'Carb', label: 'Hydrolysis', reagents: 'Acid/Alkali + Heat', type: 'Hydrolysis' },
            { source: 'Ester', target: 'Alc1', label: 'Hydrolysis', reagents: 'Acid/Alkali + Heat', type: 'Hydrolysis' },

            // Dehydration
            { source: 'Alc1', target: 'Alkene', label: 'Dehydration', reagents: 'Hot Al₂O₃', type: 'Elimination' },
            { source: 'AlcoholGroup', target: 'Alkene', label: 'Dehydration', reagents: 'Hot Al₂O₃ or Conc. H₂SO₄', type: 'Elimination' }
        ]
    };

    return { colors, gData };
})();

if (typeof module !== 'undefined') {
    module.exports = reactionMapData;
}

if (typeof window !== 'undefined') {
    window.reactionMapData = reactionMapData;
}
