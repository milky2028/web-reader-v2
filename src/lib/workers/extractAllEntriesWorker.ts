import type {
	ExtractAllEntriesParametersPayload,
	ExtractAllEntriesReturnPayload
} from '$lib/extractAllEntries';
import { writeFile } from '$lib/filesystem/writeFile';

self.addEventListener(
	'message',
	async ({ data: { file, bookName } }: MessageEvent<ExtractAllEntriesParametersPayload>) => {
		const { wasm } = await import('$lib/wasm');
		const { allocateFile } = await import('$lib/allocateFile');

		const onReadPtr = wasm.addFunction(async (path_ptr: number, ptr: number, size: number) => {
			// eslint-disable-next-line new-cap
			const path = wasm.UTF8ToString(path_ptr);

			const buffer = wasm.get_buffer(ptr, size);
			const fileToWrite = new File([buffer], path);

			await writeFile(`/books/${bookName}/${path}`, fileToWrite);
		}, 'viii');

		const allocated = await allocateFile(file);
		wasm.extract_all_entries(allocated.ptr, allocated.size, onReadPtr);
		postMessage({} as ExtractAllEntriesReturnPayload);
		// allocated.free();
	}
);
