import { allocateFile } from '$lib/allocateFile';
import type {
	ExtractBookParamsPayload,
	ExtractBookReturnCompletionPayload,
	ExtractBookReturnInitalizationPayload
} from '$lib/extractBook';
import { writeFile } from '$lib/filesystem/writeFile';
import { range } from '$lib/range';

const CHUNK_SIZE = 8;

self.addEventListener(
	'message',
	async ({ data: { file, bookName } }: MessageEvent<ExtractBookParamsPayload>) => {
		const startWorker = performance.now();
		const [wasm, { readArchiveEntries }, wasmFile] = await Promise.all([
			import('$lib/wasm').then(({ wasm }) => wasm),
			import('$lib/readArchiveEntries'),
			allocateFile(file)
		]);
		writeFile(`/books/${bookName}/archive`, file);
		// eslint-disable-next-line no-console
		console.log('time to start worker', performance.now() - startWorker);

		const pages = [...readArchiveEntries({ wasm, file: wasmFile })]
			.map((entry) => entry?.fileName)
			.filter((fileName): fileName is string => fileName !== undefined)
			.sort();

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

			const start = performance.now();
			// eslint-disable-next-line no-await-in-loop
			await Promise.all(operations);
			// eslint-disable-next-line no-console
			console.log(`time to extract ${CHUNK_SIZE} chunks`, performance.now() - start);

			const coverFile = extractedChunks.get(coverName);
			if (coverFile && !coverFound) {
				const payload: ExtractBookReturnInitalizationPayload = {
					messageType: 'initialization',
					pageNames: pages,
					coverFile
				};

				coverFound = true;
				self.postMessage(payload);
			}
		}

		const payload: ExtractBookReturnCompletionPayload = { messageType: 'completion' };
		self.postMessage(payload);
		wasmFile.free();
	}
);
