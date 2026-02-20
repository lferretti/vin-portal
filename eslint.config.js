// @ts-check
const eslint = require("@eslint/js");
const tseslint = require("typescript-eslint");
const angular = require("angular-eslint");
const tailwindcss = require("eslint-plugin-tailwindcss");
const noFormInputModifier = require("./eslint-rules/no-form-input-modifier");

module.exports = tseslint.config(
  {
    files: ["**/*.ts"],
    extends: [
      eslint.configs.recommended,
      ...tseslint.configs.recommended,
      ...angular.configs.tsRecommended,
    ],
    processor: angular.processInlineTemplates,
    plugins: {
      tailwindcss,
      local: { rules: { "no-form-input-modifier": noFormInputModifier } },
    },
    rules: {
      "@angular-eslint/directive-selector": [
        "error",
        {
          type: "attribute",
          prefix: "app",
          style: "camelCase",
        },
      ],
      "@angular-eslint/component-selector": [
        "error",
        {
          type: "element",
          prefix: "app",
          style: "kebab-case",
        },
      ],
      "@typescript-eslint/no-explicit-any": "error",
      "no-console": "error",
      "local/no-form-input-modifier": "error",
      "tailwindcss/classnames-order": "warn",
    },
    settings: {
      tailwindcss: {
        config: {},
      },
    },
  },
  {
    files: ["**/*.spec.ts", "**/*.e2e-spec.ts", "e2e/**/*.ts"],
    rules: {
      "no-console": "off",
    },
  },
  {
    files: ["**/*.html"],
    extends: [
      ...angular.configs.templateRecommended,
      ...angular.configs.templateAccessibility,
    ],
    plugins: {
      tailwindcss,
    },
    rules: {
      "tailwindcss/classnames-order": "warn",
    },
    settings: {
      tailwindcss: {
        config: {},
      },
    },
  }
);
