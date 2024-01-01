import { fileToImage } from './fileToImage';
import { books } from './stores/books';
import { pages } from './stores/pages';

export type ExtractBookParametersPayload = {
	file: File;
	bookName: string;
};

export type ExtractBookCompletionPayload = {
	messageType: 'completion';
};

export type ExtractBookPagePayload = {
	pageFile: File;
	pageName: string;
	messageType: 'page';
};

export type ExtractBookWritePayload = {
	messageType: 'write-complete';
};

export type ExtractBookReturnPayload =
	| ExtractBookCompletionPayload
	| ExtractBookPagePayload
	| ExtractBookWritePayload;

export function extractBook(params: ExtractBookParametersPayload) {
	const worker = new Worker(new URL('./workers/extractBookWorker', import.meta.url), {
		type: 'module'
	});

	return new Promise<void>((resolve) => {
		const pageMap = new Map<string, File>();
		let writes = 0;

		worker.addEventListener(
			'message',
			async ({ data: returnPayload }: MessageEvent<ExtractBookReturnPayload>) => {
				if (returnPayload.messageType === 'page') {
					pageMap.set(returnPayload.pageName, returnPayload.pageFile);
				}

				if (returnPayload.messageType === 'completion') {
					const pageNames = [...pageMap.keys()].sort();
					const [coverName] = pageNames;

					books.add(params.bookName, {
						pages: pageNames,
						coverName,
						lastPage: 0
					});

					pages.add(coverName, await fileToImage(pageMap.get(coverName) as File));
					resolve();
				}

				if (returnPayload.messageType === 'write-complete') {
					writes++;
					if (writes === pageMap.size) {
						setTimeout(() => worker.terminate(), 0);
					}
				}
			}
		);

		worker.postMessage(params);
	});
}
