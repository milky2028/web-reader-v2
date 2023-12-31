import type {
	ExtractSingleEntryParametersPayload,
	ExtractSingleEntryReturnPayload
} from '$lib/extractSingleEntry';
import { writeFile } from '$lib/filesystem/writeFile';

function entryWasFound(path_ptr: string, ptr: number, size: number) {
	return path_ptr != 'not-found' && ptr != 0 && size != 0;
}

self.addEventListener(
	'message',
	async ({
		data: { file, entryName, bookName }
	}: MessageEvent<ExtractSingleEntryParametersPayload>) => {
		const { wasm } = await import('$lib/wasm');
		const { allocateFile } = await import('$lib/allocateFile');

		const allocated = await allocateFile(file);

		const onFoundPtr = wasm.addFunction(async (path_ptr: number, ptr: number, size: number) => {
			// eslint-disable-next-line new-cap
			const path = wasm.UTF8ToString(path_ptr);
			const segments = path.split('/');
			const fileName = segments.pop();

			if (entryWasFound(path, ptr, size) && fileName) {
				const buffer = wasm.get_buffer(ptr, size);
				const fileToWrite = new File([buffer], fileName);
				await writeFile(`/books/${bookName}/${fileName}`, fileToWrite);
			}
		}, 'viii');

		wasm.extract_single_entry(allocated.ptr, allocated.size, entryName, onFoundPtr);

		postMessage({} as ExtractSingleEntryReturnPayload);
		allocated.free();
	}
);
