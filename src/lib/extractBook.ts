import { books } from '$lib/stores/books';
import { pages } from '$lib/stores/pages';
import { fileToImage } from '$lib/fileToImage';
import { progress } from './stores/progress';

type ExtractBookFunctionParams = {
	bookName: string;
	file: File;
};

export type ExtractBookWorkerParams = {
	bookName: string;
	file: File;
};

export type ExtractBookReturnInitalizationPayload = {
	messageType: 'initialization';
	totalPages: number;
};

export type ExtractBookCoverProcessedPayload = {
	messageType: 'cover-extracted';
	pageNames: string[];
	coverFile: File;
};

export type ExtractBookChunksPayload = {
	messageType: 'chunks-extracted';
	amount: number;
};

export type ExtractBookReturnCompletionPayload = {
	messageType: 'completion';
};

export type ExtractBookReturnPayload =
	| ExtractBookReturnInitalizationPayload
	| ExtractBookCoverProcessedPayload
	| ExtractBookChunksPayload
	| ExtractBookReturnCompletionPayload;

export function extractBook({ bookName, file }: ExtractBookFunctionParams) {
	const worker = new Worker(new URL('./workers/extractionWorker', import.meta.url), {
		type: 'module'
	});

	return new Promise<void>((resolve) => {
		worker.addEventListener(
			'message',
			async ({ data: message }: MessageEvent<ExtractBookReturnPayload>) => {
				if (message.messageType === 'initialization') {
					progress.updateTotal(message.totalPages);
				}

				if (message.messageType === 'cover-extracted') {
					const [coverName] = message.pageNames;
					books.add(bookName, {
						pages: message.pageNames,
						coverName,
						lastPage: 0
					});

					pages.add(coverName, await fileToImage(message.coverFile));
					resolve();
				}

				if (message.messageType === 'chunks-extracted') {
					progress.increment(message.amount);
				}

				if (message.messageType === 'completion') {
					progress.clear();
					setTimeout(() => worker.terminate(), 0);
				}
			}
		);

		const payload: ExtractBookWorkerParams = { bookName, file };
		worker.postMessage(payload);
	});
}
