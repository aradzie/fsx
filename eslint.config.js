import js from "@eslint/js";
import ava from "eslint-plugin-ava";
import node from "eslint-plugin-n";
import simpleImportSort from "eslint-plugin-simple-import-sort";
import globals from "globals";
import ts from "typescript-eslint";

export default [
  {
    files: ["**/*.{js,ts}"],
  },
  {
    ignores: ["**/lib/", "**/docs/", "**/tmp/"],
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
      "@typescript-eslint/consistent-type-assertions": "error",
      "@typescript-eslint/consistent-type-definitions": "error",
      "@typescript-eslint/consistent-type-imports": "error",
      "n/file-extension-in-import": ["error", "always"],
      "n/prefer-global/buffer": ["error", "always"],
      "n/prefer-global/console": ["error", "always"],
      "n/prefer-global/process": ["error", "always"],
      "n/prefer-global/text-decoder": ["error", "always"],
      "n/prefer-global/text-encoder": ["error", "always"],
      "n/prefer-global/url": ["error", "always"],
      "n/prefer-global/url-search-params": ["error", "always"],
      "n/prefer-node-protocol": "error",
      "n/prefer-promises/dns": "error",
      "n/prefer-promises/fs": "error",
    },
  },
  {
    plugins: {
      "simple-import-sort": simpleImportSort,
    },
    rules: {
      "simple-import-sort/imports": [
        "error",
        { groups: [["^\\u0000", "^node:", "^@?\\w", "^", "^\\."]] },
      ],
      "simple-import-sort/exports": ["error"],
    },
  },
  {
    files: ["**/*.test.ts"],
    rules: {
      "n/no-extraneous-import": ["error", { allowModules: ["ava"] }],
    },
  },
];
