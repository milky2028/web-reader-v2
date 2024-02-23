import { allocateFile } from '$lib/allocateFile';
import type {
	ExtractBookChunksPayload,
	ExtractBookCoverProcessedPayload,
	ExtractBookReturnCompletionPayload,
	ExtractBookReturnInitalizationPayload,
	ExtractBookWorkerParams
} from '$lib/extractBook';
import { writeFile } from '$lib/filesystem/writeFile';
import { range } from '$lib/range';

const CHUNK_SIZE = 1;

self.addEventListener(
	'message',
	async ({ data: { bookName, file } }: MessageEvent<ExtractBookWorkerParams>) => {
		const [wasm, { readArchiveEntries }, wasmFile] = await Promise.all([
			import('$lib/wasm').then(({ wasm }) => wasm),
			import('$lib/readArchiveEntries'),
			allocateFile(file)
		]);

		const pages = [...readArchiveEntries({ wasm, file: wasmFile })]
			.map((entry) => entry.fileName)
			.sort();

		const initializationPayload: ExtractBookReturnInitalizationPayload = {
			messageType: 'initialization',
			totalPages: pages.length
		};
		self.postMessage(initializationPayload);

		const [coverName] = pages;
		const entry_iterator = readArchiveEntries({ wasm, file: wasmFile, extractData: true });
		let coverFound = false;
		const extractedChunks = new Map<string, File>();
		for (let i = 0; i < pages.length; i += CHUNK_SIZE) {
			const operations = range({ start: i, end: i + CHUNK_SIZE }).map(async () => {
				const page = entry_iterator.next().value;
				if (page?.file) {
					await writeFile(`/books/${bookName}/${page.fileName}`, page.file);
					extractedChunks.set(page.fileName, page.file);
				}
			});

			// eslint-disable-next-line no-await-in-loop
			await Promise.all(operations);

			const coverFile = extractedChunks.get(coverName);
			if (coverFile && !coverFound) {
				const payload: ExtractBookCoverProcessedPayload = {
					messageType: 'cover-extracted',
					pageNames: pages,
					coverFile
				};

				coverFound = true;
				self.postMessage(payload);
			}

			const payload: ExtractBookChunksPayload = {
				messageType: 'chunks-extracted',
				amount: operations.length
			};
			self.postMessage(payload);
		}

		wasmFile.free();
		const completionPayload: ExtractBookReturnCompletionPayload = {
			messageType: 'completion'
		};
		self.postMessage(completionPayload);
	}
);
