const typescriptParser = require('@typescript-eslint/parser');
const typescriptPlugin = require('@typescript-eslint/eslint-plugin');

module.exports = [
    {
        files: ["src/**/*.ts"],
        languageOptions: {
            parser: typescriptParser,
        },
        plugins: {
            "@typescript-eslint": typescriptPlugin,
        },
        rules: {
            "semi": "error",
            "prefer-const": "error",
            ...typescriptPlugin.configs["eslint-recommended"].rules,
            ...typescriptPlugin.configs["recommended"].rules,
        }
    }
];