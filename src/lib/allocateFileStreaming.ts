function createWritableMemoryStream(
	wasm: Awaited<typeof import('#lib/wasm.ts').wasm>,
	startingPtr: number
) {
	let position = startingPtr;

	return new WritableStream<Uint8Array>({
		write(chunk) {
			wasm.HEAPU8.set(chunk, position);
			position += chunk.byteLength;
		}
	});
}

export async function allocateFileStreaming(file: File) {
	const wasm = await import('#lib/wasm.ts').then(({ wasm }) => wasm);
	const ptr = wasm._malloc(file.size);
	await file.stream().pipeTo(createWritableMemoryStream(wasm, ptr));

	return {
		ptr,
		size: file.size,
		free: () => wasm._free(ptr)
	};
}
