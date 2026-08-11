import tsParser from "@typescript-eslint/parser";

/** @type {import('eslint').Linter.Config} */
export default [
  {
    ignores: ["**/dist/**", "**/node_modules/**", "**/.pnpm-store/**", "coverage/**"],
  },
  {
    files: ["apps/api/src/**/*.{ts,tsx}"],
    languageOptions: {
      parser: tsParser,
      parserOptions: { ecmaVersion: "latest", sourceType: "module" },
    },
    rules: {
      "max-lines": ["error", { max: 200, skipBlankLines: true, skipComments: true }],
      "max-lines-per-function": ["error", { max: 40, skipBlankLines: true, skipComments: true }],
      "max-params": ["error", 4],
      "complexity": ["warn", 10],
      "no-console": ["warn"],
      "no-eval": ["error"],
    },
  },
  {
    files: ["apps/web/src/**/*.{ts,tsx}"],
    languageOptions: {
      parser: tsParser,
      parserOptions: { ecmaVersion: "latest", sourceType: "module", jsx: "react-jsx" },
    },
    rules: {
      "max-lines": ["error", { max: 200, skipBlankLines: true, skipComments: true }],
      "max-lines-per-function": ["warn", { max: 60, skipBlankLines: true, skipComments: true }],
      "max-params": ["error", 4],
      "complexity": ["warn", 15],
      "no-console": ["warn"],
      "no-eval": ["error"],
    },
  },
  {
    files: ["**/*.test.ts", "**/__tests__/**/*.{ts,tsx}"],
    languageOptions: {
      parser: tsParser,
      parserOptions: { ecmaVersion: "latest", sourceType: "module" },
    },
    rules: {
      "max-lines": ["off"],
      "max-lines-per-function": ["off"],
      "max-params": ["off"],
      "complexity": ["off"],
      "no-console": ["off"],
      "no-eval": ["error"],
    },
  },
  {
    files: ["**/*.{js,mjs,cjs}"],
    languageOptions: {
      parserOptions: { ecmaVersion: "latest", sourceType: "module" },
    },
    rules: {
      "max-lines": ["error", { max: 200, skipBlankLines: true, skipComments: true }],
      "max-lines-per-function": ["error", { max: 40, skipBlankLines: true, skipComments: true }],
      "max-params": ["error", 4],
      "complexity": ["error", 8],
      "no-eval": ["error"],
    },
  },
];
