let worker: Worker | undefined;

type WriteResponseEvent = MessageEvent<{
	error?: string;
	id: string;
	returnVal: UnrarDirectory;
}>;

export function unrarFallback(compressedFile: File) {
	const id = crypto.randomUUID();

	return new Promise<UnrarDirectory>((resolve, reject) => {
		if (!worker) {
			worker = new Worker(new URL('./workers/unrarFallbackWorker', import.meta.url));
		}

		worker.addEventListener(
			'message',
			({ data: { id: responseId, error, returnVal } }: WriteResponseEvent) => {
				if (responseId === id) {
					if (error) {
						reject(new Error(error));
					} else {
						resolve(returnVal);
					}
				}
			}
		);

		worker.postMessage({ compressedFile, id });
	});
}
