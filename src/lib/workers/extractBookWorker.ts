import type {
	ExtractBookCompletionPayload,
	ExtractBookCoverFilePayload,
	ExtractBookPagePayload,
	ExtractBookParametersPayload,
	ExtractBookReportProgressLengthPayload
} from '$lib/extractBook';
import { writeFile } from '$lib/filesystem/writeFile';
import { vectorToArray } from '$lib/vectorToArray';

function entryWasFound(path_ptr: string, ptr: number, size: number) {
	return path_ptr != 'not-found' && ptr != 0 && size != 0;
}

self.addEventListener(
	'message',
	async ({ data: { file, bookName } }: MessageEvent<ExtractBookParametersPayload>) => {
		const { wasm } = await import('$lib/wasm');
		const { allocateFile } = await import('$lib/allocateFile');

		const allocated = await allocateFile(file);

		function extractSingleEntry(entryName: string) {
			return new Promise<File>((resolve) => {
				const onFoundPtr = wasm.addFunction(async (path_ptr: number, ptr: number, size: number) => {
					// eslint-disable-next-line new-cap
					const fileName = wasm.UTF8ToString(path_ptr);

					if (entryWasFound(fileName, ptr, size) && fileName) {
						const buffer = wasm.get_buffer(ptr, size);
						const fileToWrite = new File([buffer], fileName);

						resolve(fileToWrite);
						await writeFile(`/books/${bookName}/${fileName}`, fileToWrite);
					}
				}, 'viii');

				wasm.extract_single_entry(allocated.ptr, allocated.size, entryName, onFoundPtr);
			});
		}

		const pageNames = vectorToArray<string>(wasm.list_entry_paths(allocated.ptr, allocated.size));
		postMessage({
			messageType: 'book-setup',
			pageNames
		} as ExtractBookReportProgressLengthPayload);
		const [coverName] = pageNames;

		function extractAllEntries() {
			let reads = 0;
			const onReadPtr = wasm.addFunction(async (path_ptr: number, ptr: number, size: number) => {
				// eslint-disable-next-line new-cap
				const path = wasm.UTF8ToString(path_ptr);

				const buffer = wasm.get_buffer(ptr, size);
				const fileToWrite = new File([buffer], path);

				postMessage({
					messageType: 'page',
					pageFile: fileToWrite,
					pageName: path
				} as ExtractBookPagePayload);
				await writeFile(`/books/${bookName}/${path}`, fileToWrite);
				reads++;

				if (reads === pageNames.length) {
					postMessage({ messageType: 'completion' } as ExtractBookCompletionPayload);
				}
			}, 'viii');

			wasm.extract_all_entries(allocated.ptr, allocated.size, onReadPtr);
		}

		const coverFile = await extractSingleEntry(coverName);
		postMessage({ coverFile, messageType: 'cover-file', coverName } as ExtractBookCoverFilePayload);

		extractAllEntries();
		allocated.free();
	}
);
