import type {
	ExtractBookInitializationReturnPayload,
	ExtractBookPagePayload,
	ExtractBookParametersPayload
} from '$lib/extractBook';
import { writeFile } from '$lib/filesystem/writeFile';
import { allocateFile } from '$lib/allocateFile';
import { vectorToArray } from '$lib/vectorToArray';

// After about a million years and attempts at the best way to do this I finally know the best way:
// Safari can't handle writing too many chunks at once, so in order to get around this, we need to chunk the extraction of files.
// libarchive doesn't support the actual searching for files, but it does give us an iterator that allows us to go through files one at a time.
// We don't want to overconsume memory by opening the archive too many times.
// We can limit opening the archive to twice by retaining a pointer to it.
// The difficultly is that we need to open the archive and iterate through it to get all the file names and sort them.
// So first we:
// - write the archive to disk since we won't be unarchiving the whole thing at once.
// - allocate the file only once (within the worker)
// - open the archive, but don't read any files, so we can get a list of file names, sort them and get the cover name.
// - extract the first 5 items from archive, check to see if this list contains the cover. If it does, navigate to the book.
// - then get one issue's worth of chunks (currently 35, realistically Safari can handle alot more chunks than this, about 250 on desktop)
// - when navigating through the book, check to see if we have the page on disk, if not iterate through the chunks until we have it

// const CHUNK_PAGE = 35;

function chunksExhausted(path_ptr: string, ptr: number, size: number) {
	return path_ptr === 'chunks-exhausted' && ptr === 0 && size === 0;
}

self.addEventListener(
	'message',
	async ({ data: params }: MessageEvent<ExtractBookParametersPayload>) => {
		const {
			wasm: { extract_chunks, addFunction, get_buffer, UTF8ToString, get_archive, list_all_entries }
		} = await import('$lib/wasm');

		const extractedChunks = new Map<string, File>();
		let allocated: Awaited<ReturnType<typeof allocateFile>> | null = null;
		let archivePtr = 0;

		function extractChunks(bookName: string, chunksToExtract: number) {
			return new Promise<void>((resolve) => {
				function onRead(pageNamePtr: number, pagePtr: number, pageSize: number) {
					// eslint-disable-next-line new-cap
					const pageName = UTF8ToString(pageNamePtr);
					if (chunksExhausted(pageName, pagePtr, pageSize)) {
						resolve();
					} else {
						const buffer: Uint8Array = get_buffer(pagePtr, pageSize);
						const page = new File([buffer], pageName);

						writeFile(`/books/${bookName}/${pageName}`, page);

						extractedChunks.set(pageName, page);
						const payload: ExtractBookPagePayload = {
							messageType: 'page',
							pageFile: page,
							pageName
						};
						self.postMessage(payload);
					}
				}

				const onReadPtr = addFunction(onRead, 'viii');
				extract_chunks(archivePtr, chunksToExtract, onReadPtr);
			});
		}

		if (params.messageType === 'initialize') {
			allocated = await allocateFile(params.file);
			archivePtr = get_archive(allocated.ptr, allocated.size);

			const pagesVector = list_all_entries(allocated.ptr, allocated.size);
			const pages = vectorToArray<string>(pagesVector);
			pagesVector.delete();

			await extractChunks(params.bookName, 12);
			const [coverName] = pages;
			const coverFile = extractedChunks.get(coverName);

			if (coverFile) {
				const payload: ExtractBookInitializationReturnPayload = {
					messageType: 'initialization-complete',
					pageNames: pages,
					coverFile
				};
				self.postMessage(payload);
			}
		}
	}
);
