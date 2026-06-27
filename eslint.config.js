import js from "@eslint/js";
import globals from "globals";
import reactHooks from "eslint-plugin-react-hooks";
import react from "eslint-plugin-react";

export default [
  { ignores: ["dist", "node_modules", "FutDraft_Design"] },
  js.configs.recommended,
  {
    files: ["src/**/*.{js,jsx}", "test_engine.js"],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: "module",
      globals: { ...globals.browser, ...globals.node },
      parserOptions: { ecmaFeatures: { jsx: true } },
    },
    plugins: { "react-hooks": reactHooks, react },
    settings: { react: { version: "18" } },
    rules: {
      ...reactHooks.configs.recommended.rules,
      // marca componentes referenciados só em JSX como "usados" (evita falso-positivo)
      "react/jsx-uses-vars": "error",
      "react/jsx-uses-react": "off",
      // Bugs reais como erro; ruído estilístico como aviso.
      "no-unused-vars": ["warn", { argsIgnorePattern: "^_", varsIgnorePattern: "^_", caughtErrorsIgnorePattern: "^_" }],
      "no-empty": ["warn", { allowEmptyCatch: true }],
      "react-hooks/exhaustive-deps": "warn",
    },
  },
];
