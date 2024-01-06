type GetDirectoryHandleParams = {
	kind: 'directory';
	create?: boolean;
};

type GetFileHandleParams = {
	kind?: 'file';
	create?: boolean;
};

export async function getHandle(
	path: string,
	params: GetDirectoryHandleParams
): Promise<FileSystemDirectoryHandle>;
export async function getHandle(
	paths: string,
	params?: GetFileHandleParams
): Promise<FileSystemFileHandle>;
export async function getHandle(
	path: string,
	params?: GetFileHandleParams | GetDirectoryHandleParams
): Promise<FileSystemFileHandle | FileSystemDirectoryHandle> {
	const kind = params?.kind ?? 'file';
	const create = params?.create ?? false;

	const segments = path.split('/').filter(Boolean);
	const fileName = segments.pop();

	if (!fileName || path.endsWith('/')) {
		throw new Error('invalid-path');
	}

	let directory = await navigator.storage.getDirectory();
	for (const segment of segments) {
		// eslint-disable-next-line no-await-in-loop
		directory = await directory.getDirectoryHandle(segment, { create });
	}

	return kind === 'directory' ? directory : directory.getFileHandle(fileName, { create });
}
