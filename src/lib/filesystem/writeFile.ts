import { getHandle } from './getHandle';

type WriteResponseEvent = MessageEvent<{ returnVal: 'completed' | 'failed' | string; id: string }>;
let worker: Worker | undefined;

export async function writeFile(path: string, file: File) {
	const fileHandle = await getHandle(path, { create: true });
	if ('createWritable' in fileHandle) {
		const writer = await fileHandle.createWritable();
		return file.stream().pipeTo(writer);
	}

	if (typeof WorkerGlobalScope !== 'undefined' && self instanceof WorkerGlobalScope) {
		let position = 0;
		const syncHandle = await (fileHandle as FileSystemFileHandle).createSyncAccessHandle();
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
	} else {
		const id = crypto.randomUUID();
		return new Promise<void>((resolve, reject) => {
			if (!worker) {
				worker = new Worker(new URL('../workers/fileWriter', import.meta.url), {
					type: 'module'
				});

				worker.addEventListener(
					'message',
					({ data: { returnVal, id: responseId } }: WriteResponseEvent) => {
						if (responseId === id) {
							if (returnVal === 'completed') {
								resolve();
							} else {
								reject(new Error(returnVal));
							}
						}
					}
				);
			}

			worker.postMessage({ path, file, id });
		});
	}
}
