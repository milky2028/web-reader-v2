import { fileToImage } from './fileToImage';
import { books } from './stores/books';
import { pages } from './stores/pages';

type ExtactBookFunctionParametersPayload = {
	file: File;
	bookName: string;
};

export type ExtractBookInitializePayload = ExtactBookFunctionParametersPayload & {
	messageType: 'initialize';
};

export type ExtractBookChunksPayload = {
	messageType: 'extract-chunks';
};

export type ExtractBookParametersPayload = ExtractBookInitializePayload | ExtractBookChunksPayload;

export type ExtractBookChunkCompletionPayload = {
	messageType: 'chunks-exchausted';
};

export type ExtractBookPagePayload = {
	pageFile: File;
	pageName: string;
	messageType: 'page';
};

export type ExtractBookInitializationReturnPayload = {
	coverFile: File;
	pageNames: string[];
	messageType: 'initialization-complete';
};

export type ExtractBookReturnPayload =
	| ExtractBookChunkCompletionPayload
	| ExtractBookPagePayload
	| ExtractBookInitializationReturnPayload;

export function createExtractor({ file, bookName }: ExtactBookFunctionParametersPayload) {
	const worker = new Worker(new URL('./workers/extractBookWorker', import.meta.url), {
		type: 'module'
	});

	return {
		initialize() {
			return new Promise<void>((resolve) => {
				worker.addEventListener(
					'message',
					async ({ data: params }: MessageEvent<ExtractBookReturnPayload>) => {
						if (params.messageType === 'initialization-complete') {
							const [coverName] = params.pageNames;
							books.add(bookName, {
								pages: params.pageNames,
								coverName,
								lastPage: 0
							});

							pages.add(coverName, await fileToImage(params.coverFile));
							resolve();
						}
					}
				);

				const payload: ExtractBookInitializePayload = {
					messageType: 'initialize',
					file,
					bookName
				};
				worker.postMessage(payload);
			});
		}
	};
}
