module.exports = {
  env: {
    commonjs: true,
    es6: true,
    node: true,
  },
  extends: ['eslint:recommended'],
  globals: {
    after: 'readonly',
    afterEach: 'readonly',
    Atomics: 'readonly',
    before: 'readonly',
    beforeEach: 'readonly',
    describe: 'readonly',
    document: 'readonly',
    it: 'readonly',
    SharedArrayBuffer: 'readonly',
    window: 'readonly',
  },
  parserOptions: {
    ecmaVersion: 2018,
    sourceType: 'module',
    allowImportExportEverywhere: true,
  },
  rules: {
    indent: ['error', 2],
    semi: ['error', 'never'],
  },
}
