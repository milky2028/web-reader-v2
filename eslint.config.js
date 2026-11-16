import js from '@eslint/js';
import prettier from 'eslint-config-prettier';
import svelte from 'eslint-plugin-svelte';
import globals from 'globals';
import ts from 'typescript-eslint';

export default ts.config(
	{ ignores: ['build/', '.svelte-kit/', 'node_modules/', 'static/'] },
	js.configs.recommended,
	...ts.configs.recommended,
	...svelte.configs.recommended,
	prettier,
	...svelte.configs.prettier,
	{
		languageOptions: { globals: { ...globals.browser, ...globals.worker, __IS_DEV__: 'readonly' } }
	},
	{
		files: ['**/*.svelte', '**/*.svelte.ts'],
		languageOptions: { parserOptions: { parser: ts.parser, extraFileExtensions: ['.svelte'] } }
	},
	{
		rules: {
			'no-console': 'error',
			'no-await-in-loop': 'error',
			'prefer-const': 'error',
			'no-var': 'error',
			eqeqeq: 'error',
			'@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }]
		}
	},
	{
		// End-to-end tests run in Node and drive the browser one step at a time.
		files: ['e2e/**'],
		languageOptions: { globals: globals.node },
		rules: { 'no-await-in-loop': 'off' }
	}
);
