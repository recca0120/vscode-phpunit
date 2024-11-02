import typescriptEslint from "@typescript-eslint/eslint-plugin";
import tsParser from "@typescript-eslint/parser";

export default [{
    files: ["**/*.ts"],
    ignores: [
        "**/out",
        "**/dist",
        "**/*.d.ts",
        "eslint.config.mjs",
    ],
}, {
    plugins: {
        "@typescript-eslint": typescriptEslint,
    },

    languageOptions: {
        parser: tsParser,
        ecmaVersion: 6,
        sourceType: "module",
    },

    rules: {
        'semi': [2, "always"],
        'curly': ["warn"],
        'eqeqeq': ["warn"],
        '@typescript-eslint/no-explicit-any': 0,
        '@typescript-eslint/explicit-module-boundary-types': 0,
        '@typescript-eslint/no-non-null-assertion': 0,
        "@typescript-eslint/naming-convention": ["warn"],
    },
}];