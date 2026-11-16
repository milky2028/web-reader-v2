// Serves the production build (`pnpm build`) with Vite's preview server on a free port.
import { existsSync } from 'node:fs';
import { createServer } from 'node:net';
import { fileURLToPath } from 'node:url';
import { preview } from 'vite';

const root = fileURLToPath(new URL('../..', import.meta.url));

function freePort() {
	return new Promise((resolve, reject) => {
		const server = createServer();
		server.listen(0, '127.0.0.1', () => {
			const { port } = server.address();
			server.close(() => resolve(port));
		});
		server.on('error', reject);
	});
}

export async function startApp() {
	if (!existsSync(new URL('../../.svelte-kit/output/client', import.meta.url))) {
		throw new Error('No production build found. Run `pnpm build` first.');
	}

	const port = await freePort();
	const server = await preview({
		root,
		logLevel: 'silent',
		preview: { host: '127.0.0.1', port, strictPort: true }
	});

	// 127.0.0.1 is a secure context, which OPFS requires.
	return { url: `http://127.0.0.1:${port}`, close: () => server.close() };
}
