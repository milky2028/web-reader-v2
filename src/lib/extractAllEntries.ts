export type ExtractAllEntriesParametersPayload = {
	file: File;
	bookName: string;
};

export type ExtractAllEntriesReturnPayload = Record<string, never>;

export function extractAllEntries(params: ExtractAllEntriesParametersPayload) {
	const url = new URL('./workers/extractAllEntriesWorker', import.meta.url);
	const worker = new Worker(url, { type: 'module' });

	worker.addEventListener('message', () => {
		setTimeout(() => worker.terminate(), 0);
	});

	worker.postMessage(params);
}
