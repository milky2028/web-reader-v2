import { fileToImage } from './fileToImage';
import { books } from './stores/books';
import { pages } from './stores/pages';
import { progress } from './stores/progress';

export type ExtractBookParametersPayload = {
	file: File;
	bookName: string;
};

export type ExtractBookCoverFilePayload = {
	coverFile: File;
	coverName: string;
	messageType: 'cover-file';
};

export type ExtractBookCompletionPayload = {
	messageType: 'completion';
};

export type ExtractBookPagePayload = {
	pageFile: File;
	pageName: string;
	messageType: 'page';
};

export type ExtractBookReportProgressLengthPayload = {
	pageNames: string[];
	messageType: 'book-setup';
};

export type ExtractBookReturnPayload =
	| ExtractBookCoverFilePayload
	| ExtractBookCompletionPayload
	| ExtractBookPagePayload
	| ExtractBookReportProgressLengthPayload;

export function extractBook(params: ExtractBookParametersPayload, onCoverExtraction: () => void) {
	const url = new URL('./workers/extractBookWorker', import.meta.url);
	const worker = new Worker(url, { type: 'module' });

	worker.addEventListener(
		'message',
		async ({ data: returnPayload }: MessageEvent<ExtractBookReturnPayload>) => {
			if (returnPayload.messageType === 'cover-file') {
				pages.add(returnPayload.coverName, await fileToImage(returnPayload.coverFile));
				onCoverExtraction();
			}

			if (returnPayload.messageType === 'book-setup') {
				books.add(params.bookName, {
					pages: returnPayload.pageNames,
					coverName: returnPayload.pageNames[0],
					lastPage: 0
				});
				progress.updateTotal(returnPayload.pageNames.length);
			}

			if (returnPayload.messageType === 'page') {
				progress.increment();
			}

			if (returnPayload.messageType === 'completion') {
				progress.clear();
				// setTimeout(() => worker.terminate(), 0);
			}
		}
	);

	worker.postMessage(params);
}
