/* eslint-disable @typescript-eslint/no-explicit-any */
import { sveltekit } from '@sveltejs/kit/vite';

export default async ({ mode }: { mode: 'production' }) => {
	const devPlugins =
		mode !== 'production'
			? [
					await import('vite-plugin-mkcert').then((m) => m.default),
					{
						name: 'configure-response-headers',
						configureServer: (server: any) => {
							server.middlewares.use((_req: any, res: any, next: any) => {
								res.setHeader('Cross-Origin-Opener-Policy', 'same-origin');
								res.setHeader('Cross-Origin-Embedder-Policy', 'require-corp');

								next();
							});
						}
					}
			  ]
			: [];

	return {
		plugins: [sveltekit(), ...devPlugins],
		define: {
			__IS_DEV__: mode !== 'production'
		},
		worker: {
			format: 'es'
		},
		build: { target: 'esnext' },
		server: { https: true },
		test: {
			include: ['src/**/*.{test,spec}.{js,ts}']
		}
	};
};
