import type { ExtractPayload } from '$lib/extractBook';

self.addEventListener('message', async ({ data: { file } }: MessageEvent<ExtractPayload>) => {
	const { wasm } = await import('../wasm');

	// const temporaryFilePath = `/tmp/${file.name}`;

	// wasm.FS.writeFile(temporaryFilePath, file);
	const buffer = await file.arrayBuffer();
	const bytes = new Uint8Array(buffer);

	const ptr = wasm._malloc(bytes.byteLength);
	wasm.HEAPU8.set(bytes, ptr);

	wasm.extract_book(ptr, bytes.byteLength);
});
