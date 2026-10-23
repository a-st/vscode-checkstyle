import { defineConfig, globalIgnores } from "eslint/config";
import typescriptEslint from "@typescript-eslint/eslint-plugin";
import globals from "globals";
import tsParser from "@typescript-eslint/parser";
import path from "node:path";
import { fileURLToPath } from "node:url";
import js from "@eslint/js";
import { FlatCompat } from "@eslint/eslintrc";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const compat = new FlatCompat({
    baseDirectory: __dirname,
    recommendedConfig: js.configs.recommended,
    allConfig: js.configs.all
});

export default defineConfig([globalIgnores(["**/node_modules/", "**/dist/"]), {
    extends: compat.extends("eslint:recommended"),

    plugins: {
        "@typescript-eslint": typescriptEslint,
    },

    languageOptions: {
        globals: {
            ...globals.node,
        },

        parser: tsParser,
        ecmaVersion: 2018,
        sourceType: "module",

        parserOptions: {
            tsconfigRootDir: __dirname,
        },
    },

    settings: {
        "import/parsers": {
            "@typescript-eslint/parser": [".ts", ".tsx"],
        },
    },

    rules: {
        "sort-keys": 0,
        indent: ["error", 2],
        "no-inner-declarations": "off",
        "max-len": ["off", 120],

        quotes: ["error", "single", {
            avoidEscape: true,
        }],

        camelcase: "off",
    },
}, {
    files: ["**/*.ts", "**/*.tsx"],
    ignores: ["node_modules/","dist/"],
    extends: compat.extends("plugin:@typescript-eslint/recommended"),

    rules: {
        "@typescript-eslint/no-namespace": "off",

        "@typescript-eslint/typedef": ["warn", {
            arrowParameter: true,
            variableDeclaration: true,
            memberVariableDeclaration: true,
        }],

        "@typescript-eslint/ban-types": "off",
        "@typescript-eslint/no-unused-vars": "warn",
        "@typescript-eslint/no-explicit-any": "warn",
        "@typescript-eslint/naming-convention": "off",
    },
}]);