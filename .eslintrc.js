module.exports = {
  root: true,
  env: {
    es2020: true,
    node: true,
  },
  parser: "@typescript-eslint/parser",
  parserOptions: {
    ecmaVersion: 2020,
    sourceType: "module",
  },
  extends: [
    "eslint:recommended",
    "plugin:@typescript-eslint/eslint-recommended",
    "plugin:@typescript-eslint/recommended",
    "plugin:n/recommended",
    "plugin:ava/recommended",
  ],
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
  overrides: [
    {
      files: ["*.test.ts"],
      rules: {
        "n/no-extraneous-import": ["error", { allowModules: ["ava"] }],
      },
    },
  ],
};
