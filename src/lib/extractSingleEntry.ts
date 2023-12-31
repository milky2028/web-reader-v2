export type ExtractSingleEntryParametersPayload = {
	bookName: string;
	entryName: string;
	file: File;
};

export type ExtractSingleEntryReturnPayload = { file: File | null };

export function extractSingleEntry(params: ExtractSingleEntryParametersPayload) {
	const url = new URL('./workers/extractSingleEntryWorker', import.meta.url);
	const worker = new Worker(url, { type: 'module' });

	return new Promise<File>((resolve, reject) => {
		worker.addEventListener(
			'message',
			({ data: { file } }: MessageEvent<ExtractSingleEntryReturnPayload>) => {
				if (file) {
					resolve(file);
				} else {
					reject(new Error(`Failed to extract ${params.entryName}.`));
				}
				// setTimeout(() => worker.terminate(), 0);
			}
		);

		worker.postMessage(params);
	});
}
