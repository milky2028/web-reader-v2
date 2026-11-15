import { getHandle } from './getHandle.ts';

type WriteRequest = { path: string; data: Blob; id: number };
export type WriteResponse = { id: number; error?: string };

const isWorker = typeof WorkerGlobalScope !== 'undefined' && self instanceof WorkerGlobalScope;

/** Writes with a sync access handle (dedicated workers only); resolves once data is flushed. */
export async function writeFileSync(path: string, data: Blob | Uint8Array) {
	const fileHandle = await getHandle(path, { create: true });
	const access = await fileHandle.createSyncAccessHandle();
	try {
		const bytes = data instanceof Blob ? new Uint8Array(await data.arrayBuffer()) : data;
		access.truncate(0);
		access.write(bytes, { at: 0 });
		access.flush();
	} finally {
		access.close();
	}
}

let fallbackWorker: Worker | undefined;
let nextId = 0;
const pending = new Map<number, { resolve: () => void; reject: (error: Error) => void }>();

function writeViaWorker(path: string, data: Blob) {
	if (!fallbackWorker) {
		fallbackWorker = new Worker(new URL('../workers/fileWriter.ts', import.meta.url), {
			type: 'module'
		});
		// One listener for every request, matched by id.
		fallbackWorker.addEventListener(
			'message',
			({ data: response }: MessageEvent<WriteResponse>) => {
				const request = pending.get(response.id);
				pending.delete(response.id);
				if (response.error) {
					request?.reject(new Error(response.error));
				} else {
					request?.resolve();
				}
			}
		);
	}

	const id = nextId++;
	return new Promise<void>((resolve, reject) => {
		pending.set(id, { resolve, reject });
		fallbackWorker?.postMessage({ path, data, id } satisfies WriteRequest);
	});
}

/** Writes a file to OPFS and resolves only once it is fully written. */
export async function writeFile(path: string, data: Blob | Uint8Array) {
	if (isWorker) {
		return writeFileSync(path, data);
	}

	const blob = data instanceof Blob ? data : new Blob([data as Uint8Array<ArrayBuffer>]);
	const fileHandle = await getHandle(path, { create: true });
	if ('createWritable' in fileHandle) {
		const writable = await fileHandle.createWritable();
		await blob.stream().pipeTo(writable);
		return;
	}

	// Older Safari: no createWritable on the main thread.
	return writeViaWorker(path, blob);
}
