import type {
	ExtractBookCompletionPayload,
	ExtractBookPagePayload,
	ExtractBookParametersPayload,
	ExtractBookWritePayload
} from '$lib/extractBook';
import { writeFile } from '$lib/filesystem/writeFile';

function isDone(path_ptr: string, ptr: number, size: number) {
	return path_ptr === 'last-read' && ptr === 0 && size === 0;
}

self.addEventListener(
	'message',
	async ({ data: { file, bookName } }: MessageEvent<ExtractBookParametersPayload>) => {
		const {
			wasm: { extract_book, addFunction, get_buffer, UTF8ToString }
		} = await import('$lib/wasm');
		const { allocateFile } = await import('$lib/allocateFile');
		const allocated = await allocateFile(file);

		function onRead(pageNamePtr: number, pagePtr: number, pageSize: number) {
			// eslint-disable-next-line new-cap
			const pageName = UTF8ToString(pageNamePtr);
			if (isDone(pageName, pagePtr, pageSize)) {
				self.postMessage({ messageType: 'completion' } as ExtractBookCompletionPayload);
				allocated.free();
			} else {
				const buffer: Uint8Array = get_buffer(pagePtr, pageSize);
				const page = new File([buffer], pageName);

				writeFile(`/books/${bookName}/${pageName}`, page).then(() => {
					self.postMessage({ messageType: 'write-complete' } as ExtractBookWritePayload);
				});

				self.postMessage({
					messageType: 'page',
					pageFile: page,
					pageName
				} as ExtractBookPagePayload);
			}
		}

		extract_book(allocated.ptr, allocated.size, addFunction(onRead, 'viii'));
	}
);
