import js from "@eslint/js";
import globals from "globals";
import tseslint from "typescript-eslint";

export default tseslint.config(
  {
    ignores: [
      "dist",
      "node_modules",
      "apps/web/dist",
      "apps/api/dist",
      "service-worker.js",
      "*.html",
      "app*.js",
      "*-flow*.js",
      "calendar.js",
      "finance*.js",
      "workspace-page.js",
      "ui-workspaces.js",
      "ux-members-navigation.js",
      "js/**",
      "legacy/**"
    ]
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    files: ["**/*.{ts,tsx}"],
    languageOptions: {
      ecmaVersion: "latest",
      sourceType: "module",
      globals: {
        ...globals.browser,
        ...globals.node
      }
    },
    rules: {
      "@typescript-eslint/consistent-type-imports": "error",
      "@typescript-eslint/no-explicit-any": "off",
      "@typescript-eslint/no-unused-vars": [
        "warn",
        {
          "argsIgnorePattern": "^_"
        }
      ]
    }
  },
  {
    // Scripts Node (e2e/*.mjs, configs, etc.) usam console/process
    files: ["**/*.{mjs,cjs,js}"],
    languageOptions: {
      ecmaVersion: "latest",
      sourceType: "module",
      globals: {
        ...globals.node,
        ...globals.browser
      }
    }
  }
);
