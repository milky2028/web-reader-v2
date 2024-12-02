import { getHandle } from './getHandle';

export async function getFile(path: string) {
	const handle = await getHandle(path);
	const file = await handle.getFile()
	return file.stream()
}
