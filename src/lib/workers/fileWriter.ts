/// <reference lib="WebWorker" />;

import { getFileHandle } from '$lib/filesystem/getFileHandle';

type WriteEvent = MessageEvent<{ path: string; file: File }>;
self.addEventListener('message', async ({ data: { path, file } }: WriteEvent) => {
	try {
		const fileHandle = await getFileHandle(path, { create: true });
		const syncHandle = await fileHandle.createSyncAccessHandle();

		const buffer = await file.arrayBuffer();
		syncHandle.write(buffer, { at: 0 });

		syncHandle.flush();
		await syncHandle.close();
		self.postMessage('completed');
	} catch (e) {
		if (e instanceof Error) {
			self.postMessage(e.message);
		}

		self.postMessage('failed');
	}
});
