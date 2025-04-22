import { getHandle } from './getHandle';

export async function getFile(path: string) {
	const handle = await getHandle(path);
	return handle.getFile();
}
