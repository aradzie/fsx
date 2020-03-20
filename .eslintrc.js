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
  plugins: ["ava", "import", "@typescript-eslint"],
  extends: [
    "eslint:recommended",
    "plugin:ava/recommended",
    "plugin:import/recommended",
    "plugin:import/typescript",
    "plugin:@typescript-eslint/eslint-recommended",
    "plugin:@typescript-eslint/recommended",
  ],
  rules: {
    "eqeqeq": ["error", "always", { null: "never" }],
    "no-constant-condition": ["error", { checkLoops: false }],
    "@typescript-eslint/no-explicit-any": "off",
    "@typescript-eslint/no-use-before-define": "off",
  },
  settings: {
    "import/parsers": {
      "@typescript-eslint/parser": [".ts"],
    },
    "import/resolver": {
      typescript: {
        alwaysTryTypes: true,
        directory: "./packages/*/tsconfig.json",
      },
    },
  },
  overrides: [
    {
      files: ["*.test.ts"],
      rules: {
        "import/no-named-as-default-member": "off",
        "ava/no-ignored-test-files": "off",
      },
    },
  ],
};
