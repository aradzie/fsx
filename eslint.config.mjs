import js from "@eslint/js";
import ava from "eslint-plugin-ava";
import node from "eslint-plugin-n";
import globals from "globals";
import ts from "typescript-eslint";

export default [
  {
    files: ["**/*.{js,ts}"],
  },
  {
    ignores: [
      "**/build/",
      "**/lib/",
      "**/lib-esm/",
      "**/lib-cjs/",
      "**/docs/",
      "**/sandbox/",
      "**/tmp/",
    ],
  },
  { languageOptions: { globals: globals.node } },
  js.configs["recommended"],
  ...ts.configs["recommended"],
  node.configs["flat/recommended-script"],
  ava.configs["flat/recommended"],
  {
    rules: {
      "eqeqeq": ["error", "always", { null: "never" }],
      "no-constant-condition": ["error", { checkLoops: false }],
      "@typescript-eslint/no-explicit-any": "off",
      "@typescript-eslint/no-use-before-define": "off",
      "n/file-extension-in-import": ["error", "always"],
      "n/no-unsupported-features/es-syntax": "off",
      "n/no-missing-import": "off",
      "n/no-missing-require": "off",
      "n/prefer-promises/dns": ["error"],
      "n/prefer-promises/fs": ["error"],
      "n/prefer-global/buffer": ["error", "always"],
      "n/prefer-global/console": ["error", "always"],
      "n/prefer-global/process": ["error", "always"],
      "n/prefer-global/url": ["error", "always"],
      "n/prefer-global/url-search-params": ["error", "always"],
    },
  },
  {
    files: ["**/*.test.ts"],
    rules: {
      "n/no-extraneous-import": ["error", { allowModules: ["ava"] }],
    },
  },
];
