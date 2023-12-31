export type ListPagesParameterPayload = {
	file: File;
};

export type ListPagesReturnPayload = {
	pages: string[];
};

export function listPages(file: File) {
	const url = new URL('./workers/listFilesWorker', import.meta.url);
	const worker = new Worker(url, { type: 'module' });

	return new Promise<ListPagesReturnPayload['pages']>((resolve) => {
		worker.addEventListener(
			'message',
			({ data: { pages } }: MessageEvent<ListPagesReturnPayload>) => {
				resolve(pages);
				setTimeout(() => worker.terminate(), 0);
			}
		);

		worker.postMessage({ file } as ListPagesParameterPayload);
	});
}
