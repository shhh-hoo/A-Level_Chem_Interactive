const { assertIncludesAll, readJson } = require('./test-utils');

const packageJson = readJson('package.json');

assertIncludesAll(
  JSON.stringify(packageJson.devDependencies ?? {}),
  ['@types/node'],
  'package.json devDependencies',
);

const tsconfigNode = readJson('tsconfig.node.json');
const compilerOptions = tsconfigNode.compilerOptions ?? {};
const types = compilerOptions.types ?? [];

if (!Array.isArray(types) || !types.includes('node')) {
  throw new Error('Expected tsconfig.node.json to include Node types.');
}

console.log('Verified Node types for Vite config build.');
