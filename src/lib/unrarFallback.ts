let worker: Worker | undefined;

type Progress = { currentFileName: string; currentFileSize: number; amountProcessed: number };

type WriteResponseEvent = MessageEvent<{
	error?: string;
	processed: Progress;
	id: string;
	returnVal: UnrarDirectory | 'continuing';
}>;

export function unrarFallback(compressedFile: File, callback?: (progress: Progress) => void) {
	const id = crypto.randomUUID();

	return new Promise<UnrarDirectory>((resolve, reject) => {
		if (!worker) {
			worker = new Worker(new URL('./workers/unrarFallbackWorker', import.meta.url));
		}

		worker.addEventListener(
			'message',
			({ data: { id: responseId, error, returnVal, processed } }: WriteResponseEvent) => {
				if (responseId === id && returnVal === 'continuing') {
					callback?.(processed);
				}

				if (responseId === id && typeof returnVal !== 'string') {
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
