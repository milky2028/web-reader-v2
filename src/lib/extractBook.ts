export type ExtractPayload = {
	file: File;
};

export function extractBook(file: File) {
	const worker = new Worker(new URL('./workers/extractWorker', import.meta.url), {
		type: 'module'
	});

	worker.postMessage({ file });
}
