export type ExtractPayload = {
	file: File;
};

export function extractBook(file: File) {
	const worker = new Worker(new URL('./workers/extractWorker', import.meta.url), {
		type: 'module'
	});

	// worker terminating prematurely seems to prevent files from being written to disk
	// worker.addEventListener('message', () => {
	// 	worker.terminate();
	// });

	worker.postMessage({ file });
}
