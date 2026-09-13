import js from "@eslint/js";
import tseslint from "typescript-eslint";

export default tseslint.config(
  {
    ignores: ["dist/**", "build/**", "node_modules/**"],
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    rules: {
      "semi": ["error", "always"],
      "@typescript-eslint/no-explicit-any": "warn",
      "no-console": "off",
      "@typescript-eslint/no-unused-vars": "warn"
    }
  }
);
