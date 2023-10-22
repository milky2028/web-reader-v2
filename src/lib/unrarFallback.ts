let worker: Worker | undefined;

type WriteResponseEvent = MessageEvent<{ file: File | null; error?: string; id: string }>;

export function unrarFallback(compressedFile: File) {
	if (!worker) {
		worker = new Worker(new URL('./workers/unrarFallbackWorker', import.meta.url), {
			type: 'module'
		});
	}

	const id = crypto.randomUUID();
	return new Promise<File>((resolve, reject) => {
		worker?.addEventListener(
			'message',
			({ data: { id: responseId, file, error } }: WriteResponseEvent) => {
				if (responseId === id) {
					if (file instanceof File) {
						resolve(file);
					} else {
						reject(new Error(error));
					}
				}
			}
		);

		worker?.postMessage(worker.postMessage({ compressedFile, id }));
	});
}
