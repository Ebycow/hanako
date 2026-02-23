const n = require('eslint-plugin-n');
const prettier = require('eslint-plugin-prettier');
const prettierConfig = require('eslint-config-prettier');

module.exports = [
    {
        ignores: ['node_modules/**', 'coverage/**', 'db/**', 'log/**', 'files/**'],
    },
    {
        files: ['**/*.js'],
        languageOptions: {
            ecmaVersion: 2020,
            sourceType: 'commonjs',
            globals: {
                require: 'readonly',
                module: 'readonly',
                exports: 'readonly',
                __dirname: 'readonly',
                __filename: 'readonly',
                process: 'readonly',
                console: 'readonly',
                Buffer: 'readonly',
                URL: 'readonly',
                URLSearchParams: 'readonly',
                setTimeout: 'readonly',
                setInterval: 'readonly',
                clearTimeout: 'readonly',
                clearInterval: 'readonly',
                setImmediate: 'readonly',
                queueMicrotask: 'readonly',
            },
        },
        plugins: {
            n,
            prettier,
        },
        rules: {
            ...n.configs['flat/recommended'].rules,
            ...prettierConfig.rules,
            'no-unused-vars': [
                'error',
                {
                    vars: 'all',
                    args: 'none',
                    caughtErrors: 'none',
                    varsIgnorePattern: 'should',
                    ignoreRestSiblings: false,
                },
            ],
            'n/exports-style': ['error', 'module.exports'],
            'n/file-extension-in-import': ['error', 'always'],
            'n/prefer-global/buffer': ['error', 'always'],
            'n/prefer-global/console': ['error', 'always'],
            'n/prefer-global/process': ['error', 'always'],
            'n/prefer-global/url-search-params': ['error', 'always'],
            'n/prefer-global/url': ['error', 'always'],
            'n/prefer-promises/dns': 'error',
            'n/prefer-promises/fs': 'off',
            'prettier/prettier': [
                'error',
                {
                    tabWidth: 4,
                    printWidth: 120,
                    singleQuote: true,
                    trailingComma: 'es5',
                    endOfLine: 'auto',
                },
            ],
        },
    },
    {
        files: ['test/**/*.js'],
        languageOptions: {
            globals: {
                describe: 'readonly',
                context: 'readonly',
                it: 'readonly',
                specify: 'readonly',
                before: 'readonly',
                beforeEach: 'readonly',
                after: 'readonly',
                afterEach: 'readonly',
            },
        },
    },
];
