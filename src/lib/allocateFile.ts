export async function allocateFile(file: File) {
	const { wasm } = await import('$lib/wasm');

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
