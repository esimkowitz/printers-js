import js from "@eslint/js";
import tseslint from "@typescript-eslint/eslint-plugin";
import tsparser from "@typescript-eslint/parser";

export default [
  // Global ignores must be first and in their own object
  {
    ignores: [
      // Deno-managed files (use deno lint instead)
      "**/src/deno.ts",
      "**/src/tests/shared.test.ts",
      "src/tests/shared.test.ts",
      "src/deno.ts",

      // Scripts directory (use deno lint instead)
      "scripts/**/*",
      "scripts/**",

      // Example files (different environments)
      "examples/**/*",
      "examples/**",

      // Build artifacts and dependencies
      "dist/**/*",
      "dist/**",
      "target/**/*",
      "target/**",
      "npm/**/*",
      "npm/**",
      "node_modules/**/*",
      "node_modules/**",
      "test-results/**/*",
      "test-results/**",
      ".claude/**/*",
      ".claude/**",

      // Config files
      "deno.json",
      "deno.lock",
      "Cargo.toml",
      "Cargo.lock",
    ],
  },
  js.configs.recommended,
  {
    files: ["**/*.{js,ts,mjs,cjs}"],
    languageOptions: {
      parser: tsparser,
      parserOptions: {
        ecmaVersion: 2022,
        sourceType: "module",
      },
      globals: {
        console: "readonly",
        process: "readonly",
        Buffer: "readonly",
        __dirname: "readonly",
        __filename: "readonly",
        global: "readonly",
        module: "readonly",
        require: "readonly",
        exports: "readonly",
        setTimeout: "readonly",
        clearTimeout: "readonly",
        // Runtime detection globals
        Deno: "readonly",
        Bun: "readonly",
        // Deno globals
        URL: "readonly",
        TextEncoder: "readonly",
        TextDecoder: "readonly",
      },
    },
    plugins: {
      "@typescript-eslint": tseslint,
    },
    rules: {
      ...tseslint.configs.recommended.rules,

      // TypeScript-specific rules
      "@typescript-eslint/no-unused-vars": [
        "error",
        {
          argsIgnorePattern: "^_",
          varsIgnorePattern: "^_",
          caughtErrorsIgnorePattern: "^_",
        },
      ],
      "@typescript-eslint/no-explicit-any": "off", // Allow any for cross-runtime dynamic imports
      "@typescript-eslint/no-require-imports": "off", // Allow require() for Node.js compatibility
      "@typescript-eslint/explicit-function-return-type": "off",
      "@typescript-eslint/explicit-module-boundary-types": "off",
      "@typescript-eslint/no-non-null-assertion": "warn",
      "@typescript-eslint/ban-ts-comment": "off", // Allow @ts-expect-error directives

      // General rules
      "no-console": "off",
      "no-unused-vars": "off", // Use TypeScript version instead
      "prefer-const": "error",
      "no-var": "error",
      eqeqeq: "error",
      curly: "off", // Disable for cross-runtime compatibility
    },
  },
];
