module.exports = {
  env: {
    node: true,
    es2020: true,
  },
  extends: [
    'eslint:recommended',
    'prettier',
  ],
  parserOptions: {
    ecmaVersion: 'latest',
    sourceType: 'module',
  },
  plugins: ['prettier'],
  rules: {
    'prettier/prettier': 'off',
    'no-console': 'warn',
    'no-unused-vars': 'warn',
    'no-undef': 'warn',
    'no-useless-escape': 'warn',
    'no-useless-catch': 'warn',
    'no-dupe-class-members': 'warn',
    'prefer-const': 'warn',
    'no-var': 'warn',
  },
  ignorePatterns: ['dist/**', 'node_modules/**', 'coverage/**'],
};
