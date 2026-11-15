/// <reference lib="WebWorker" />

import { writeFileSync, type WriteResponse } from '#lib/filesystem/writeFile.ts';

type WriteEvent = MessageEvent<{ path: string; data: Blob; id: number }>;

self.addEventListener('message', async ({ data: { path, data, id } }: WriteEvent) => {
	try {
		await writeFileSync(path, data);
		self.postMessage({ id } satisfies WriteResponse);
	} catch (error) {
		self.postMessage({ id, error: String(error) } satisfies WriteResponse);
	}
});
