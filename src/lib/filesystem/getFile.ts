import { getFileHandle } from './getFileHandle';

export async function getFile(path: string) {
	const handle = await getFileHandle(path);
	return handle.getFile();
}
