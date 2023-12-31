export type ListEntryPathsParametersPayload = {
	file: File;
};

export type ListEntryPathsReturnPayload = {
	pages: string[];
};

export function listEntryPaths(file: File) {
	const url = new URL('./workers/listEntryPathsWorker', import.meta.url);
	const worker = new Worker(url, { type: 'module' });

	return new Promise<ListEntryPathsReturnPayload['pages']>((resolve) => {
		worker.addEventListener(
			'message',
			({ data: { pages } }: MessageEvent<ListEntryPathsReturnPayload>) => {
				resolve(pages);
				setTimeout(() => worker.terminate(), 0);
			}
		);

		worker.postMessage({ file } as ListEntryPathsParametersPayload);
	});
}
