import type { allocateFile } from './allocateFile';

type ReadArchiveEntriesParams = {
	file: Awaited<ReturnType<typeof allocateFile>>;
	extractData?: boolean;
	wasm: Awaited<typeof import('$lib/wasm').wasm>;
};

function isImage(path: string) {
	return path.endsWith('.jpg') || path.endsWith('.png');
}

export function* readArchiveEntries({ file, wasm, extractData = false }: ReadArchiveEntriesParams) {
	const {
		open_archive,
		close_archive,
		get_next_entry,
		get_entry_name,
		entry_is_file,
		get_buffer,
		read_entry_data,
		get_entry_size,
		free_buffer,
		END_OF_FILE,
		ENTRY_ERROR
	} = wasm;

	const archivePtr = open_archive(file.ptr, file.size);

	for (;;) {
		const entryPtr = get_next_entry(archivePtr);
		if (entryPtr === END_OF_FILE || entryPtr === ENTRY_ERROR) {
			close_archive(archivePtr);
			return;
		}

		const path = get_entry_name(entryPtr).toLowerCase();
		const isFile = entry_is_file(entryPtr);

		if (isFile && !path.startsWith('__macosx') && isImage(path)) {
			const fileName = path.split('/').pop() ?? '';
			if (extractData) {
				const size = get_entry_size(entryPtr);
				const entry_data = read_entry_data(archivePtr, entryPtr);
				const buffer = get_buffer(entry_data, size);
				const file = new File([buffer.slice()], fileName, { type: 'application/octet-stream' });
				free_buffer(entry_data);

				yield { fileName, file };
			} else {
				yield { fileName };
			}
		}
	}
}
