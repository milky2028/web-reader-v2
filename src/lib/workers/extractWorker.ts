import type { ExtractPayload } from '$lib/extractBook';
import { writeFile } from '$lib/filesystem/writeFile';
import { vectorToArray } from '$lib/vectorToArray';

self.addEventListener('message', async ({ data: { file } }: MessageEvent<ExtractPayload>) => {
	const { wasm } = await import('../wasm');

	async function allocateFile(file: File) {
		const buffer = await file.arrayBuffer();
		const bytes = new Uint8Array(buffer);

		const ptr = wasm._malloc(bytes.byteLength);
		wasm.HEAPU8.set(bytes, ptr);

		return {
			ptr,
			size: bytes.byteLength,
			free: () => wasm._free(ptr)
		};
	}

	const allocatedFile = await allocateFile(file);
	const onRead = wasm.addFunction(async (path_ptr: number, ptr: number, size: number) => {
		// eslint-disable-next-line new-cap
		const path = wasm.UTF8ToString(path_ptr);
		const pathSegments = path.split('/');
		const fileName = pathSegments.pop();

		const bookName = file.name.slice(0, file.name.length - 4);
		if (fileName) {
			console.log(`Writing ${`/books/${bookName}/${fileName}`}...`);

			const buffer = wasm.get_buffer(ptr, size);
			const fileToWrite = new File([buffer.slice()], fileName);

			await writeFile(`/books/${bookName}/${fileName}`, fileToWrite);
		}
	}, 'viii');

	// wasm.extract_book(allocatedFile.ptr, allocatedFile.size, onRead);
	const filesList = wasm.list_files(allocatedFile.ptr, allocatedFile.size);
	console.log(vectorToArray<string>(filesList).sort());

	allocatedFile.free();
});
