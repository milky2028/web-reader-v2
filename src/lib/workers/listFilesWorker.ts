import type { ListPagesParameterPayload, ListPagesReturnPayload } from '$lib/listPages';
import { vectorToArray } from '$lib/vectorToArray';

self.addEventListener(
	'message',
	async ({ data: { file } }: MessageEvent<ListPagesParameterPayload>) => {
		const { wasm } = await import('$lib/wasm');
		const { allocateFile } = await import('$lib/allocateFile');

		const allocated = await allocateFile(file);

		const filesList = wasm.list_files(allocated.ptr, allocated.size);
		postMessage({ pages: vectorToArray(filesList).sort() } as ListPagesReturnPayload);

		allocated.free();
	}
);