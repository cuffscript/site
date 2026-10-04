import js from "@eslint/js";
import tseslint from "typescript-eslint";

export default [
    {
        ignores: ["dist/**", "build/**", "node_modules/**"],
    },
    js.configs.recommended,
    ...tseslint.configs.recommended,
    {
        files: ["scripts/**/*.mjs", "scripts/**/*.test.mjs", "vite.config.ts"],
        languageOptions: {
            globals: {
                process: "readonly",
                console: "readonly",
                URL: "readonly",
                Buffer: "readonly",
                structuredClone: "readonly",
                test: "readonly",
                assert: "readonly",
                describe: "readonly"
            },
        },
    },
    {
        rules: {
            "semi": ["error", "always"],
            "@typescript-eslint/no-explicit-any": "warn",
            "no-console": "off",
            "@typescript-eslint/no-unused-vars": "warn"
        }
    }
];
