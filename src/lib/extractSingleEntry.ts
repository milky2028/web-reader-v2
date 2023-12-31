export type ExtractSingleEntryParametersPayload = {
	bookName: string;
	entryName: string;
	file: File;
};

export type ExtractSingleEntryReturnPayload = Record<string, never>;

export function extractSingleEntry(params: ExtractSingleEntryParametersPayload) {
	const url = new URL('./workers/extractSingleEntryWorker', import.meta.url);
	const worker = new Worker(url, { type: 'module' });

	return new Promise<void>((resolve) => {
		worker.addEventListener('message', () => {
			resolve();
			// setTimeout(() => worker.terminate(), 0);
		});

		worker.postMessage(params);
	});
}
