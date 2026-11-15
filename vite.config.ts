import adapter from '@sveltejs/adapter-static';
import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vitest/config';

export default defineConfig(({ mode }) => ({
	plugins: [
		sveltekit({
			// Everything lives on-device (OPFS), so there is nothing to render on a server.
			// Static pages are prerendered and every other route falls back to the SPA shell
			// (served for all unknown paths via static/_redirects on Netlify).
			adapter: adapter({ fallback: '200.html' })
		})
	],
	define: {
		__IS_DEV__: JSON.stringify(mode !== 'production')
	},
	worker: {
		format: 'es'
	},
	build: { target: 'esnext' },
	test: {
		include: ['src/**/*.{test,spec}.{js,ts}']
	}
}));
