/** @type {import('@commitlint/types').UserConfig} */
module.exports = {
  extends: ['@commitlint/config-conventional'],
  rules: {
    'scope-enum': [
      2,
      'always',
      ['frontend', 'backend', 'ci', 'docs', 'e2e', 'infra'],
    ],
  },
};
