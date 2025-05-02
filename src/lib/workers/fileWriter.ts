/// <reference lib="WebWorker" />;

import { getHandle } from '$lib/filesystem/getHandle';

type WriteEvent = MessageEvent<{ path: string; file: File; id: string }>;
self.addEventListener('message', async ({ data: { path, file, id } }: WriteEvent) => {
	try {
		const fileHandle = await getHandle(path, { create: true });
		const syncHandle = await fileHandle.createSyncAccessHandle();
		let position = 0;

		const syncWriter = new WritableStream<Uint8Array>({
			write(chunk) {
				syncHandle.write(chunk, { at: position });
				position += chunk.byteLength;
			},
			async close() {
				// older browser versions have this API as async
				await syncHandle.close();
			}
		});

		file.stream().pipeTo(syncWriter);
		self.postMessage({ returnVal: 'completed', id });
	} catch (e) {
		if (e instanceof Error) {
			self.postMessage({ returnVal: e.message, id });
		}

		self.postMessage({ returnVal: 'failed', id });
	}
});
