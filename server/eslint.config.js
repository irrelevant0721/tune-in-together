import globals from 'globals';

export default [
  {
    ignores: ['node_modules/**'],
  },
  {
    files: ['**/*.js'],
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
      globals: globals.node,
    },
    rules: {
      'no-constant-binary-expression': 'error',
      'no-dupe-keys': 'error',
      'no-undef': 'error',
      'no-unreachable': 'error',
    },
  },
];
