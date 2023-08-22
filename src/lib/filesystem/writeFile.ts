import { getFileHandle } from './getFileHandle';

type WriteResponseEvent = MessageEvent<'completed' | string>;

export async function writeFile(path: string, file: File) {
	const fileHandle = await getFileHandle(path, { create: true });
	if ('createWritable' in fileHandle) {
		const writer = await fileHandle.createWritable();
		return file.stream().pipeTo(writer);
	}

	return new Promise<void>((resolve, reject) => {
		const worker = new Worker(new URL('../workers/fileWriter', import.meta.url), {
			type: 'module'
		});

		worker.addEventListener('message', ({ data }: WriteResponseEvent) => {
			worker.terminate();

			if (data === 'completed') {
				resolve();
			} else {
				reject(new Error(data));
			}
		});

		worker.postMessage({ path, file });
	});
}
