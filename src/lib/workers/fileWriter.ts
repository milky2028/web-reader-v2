/// <reference lib="WebWorker" />;

import { getHandle } from '$lib/filesystem/getHandle';

type WriteEvent = MessageEvent<{ path: string; file: File; id: string }>;
self.addEventListener('message', async ({ data: { path, file, id } }: WriteEvent) => {
	try {
		const fileHandle = await getHandle(path, { create: true });
		const syncHandle = await fileHandle.createSyncAccessHandle();

		const buffer = await file.arrayBuffer();
		syncHandle.truncate(0);
		syncHandle.write(buffer, { at: 0 });

		syncHandle.flush();
		syncHandle.close();

		self.postMessage({ returnVal: 'completed', id });
	} catch (e) {
		if (e instanceof Error) {
			self.postMessage({ returnVal: e.message, id });
		}

		self.postMessage({ returnVal: 'failed', id });
	}
});
