import type {
	ListEntryPathsParametersPayload,
	ListEntryPathsReturnPayload
} from '$lib/listEntryPaths';
import { vectorToArray } from '$lib/vectorToArray';

self.addEventListener(
	'message',
	async ({ data: { file } }: MessageEvent<ListEntryPathsParametersPayload>) => {
		const { wasm } = await import('$lib/wasm');
		const { allocateFile } = await import('$lib/allocateFile');

		const allocated = await allocateFile(file);
		const filesList = wasm.list_entry_paths(allocated.ptr, allocated.size);

		postMessage({ pages: vectorToArray(filesList) } as ListEntryPathsReturnPayload);
		allocated.free();
	}
);
