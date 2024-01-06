import { getHandle } from './getHandle';

export async function deleteFile(path: string) {
	const fileName = path.split('/').pop();
	const directoryHandle = await getHandle(path, { kind: 'directory' });
	if (fileName && directoryHandle instanceof FileSystemDirectoryHandle) {
		await directoryHandle.removeEntry(fileName);
	}
}
