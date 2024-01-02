import { books } from '$lib/stores/books';
import { pages } from '$lib/stores/pages';
import { fileToImage } from './fileToImage';

type ExtractBookParams = {
	bookName: string;
	file: File;
};

export type ExtractBookParamsPayload = ExtractBookParams;

export type ExtractBookReturnInitalizationPayload = {
	messageType: 'initialization';
	pageNames: string[];
	coverFile: File;
};

export type ExtractBookReturnPayload = ExtractBookReturnInitalizationPayload;

export function extractBook({ bookName, file }: ExtractBookParams) {
	const worker = new Worker(new URL('./workers/extractionWorker', import.meta.url), {
		type: 'module'
	});

	return new Promise<void>((resolve) => {
		worker.addEventListener(
			'message',
			async ({ data: message }: MessageEvent<ExtractBookReturnPayload>) => {
				if (message.messageType === 'initialization') {
					const [coverName] = message.pageNames;
					books.add(bookName, {
						pages: message.pageNames,
						coverName,
						lastPage: 0
					});

					pages.add(coverName, await fileToImage(message.coverFile));
					resolve();
				}

				// setTimeout(() => worker.terminate(), 0);
			}
		);

		const payload: ExtractBookParamsPayload = { bookName, file };
		worker.postMessage(payload);
	});
}
