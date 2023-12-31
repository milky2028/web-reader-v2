import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vitest/config';
import cert from 'vite-plugin-mkcert';

export default defineConfig({
	plugins: [
		sveltekit(),
		cert(),
		{
			name: 'configure-response-headers',
			configureServer: (server) => {
				server.middlewares.use((_req, res, next) => {
					res.setHeader('Cross-Origin-Opener-Policy', 'same-origin');
					res.setHeader('Cross-Origin-Embedder-Policy', 'require-corp');

					next();
				});
			}
		}
	],
	server: { https: true },
	test: {
		include: ['src/**/*.{test,spec}.{js,ts}']
	}
});
