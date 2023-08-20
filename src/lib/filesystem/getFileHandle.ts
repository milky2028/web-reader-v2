export async function getFileHandle(path: string, { create = false } = {}) {
	const segments = path.split('/').filter(Boolean);
	const fileName = segments.pop();

	if (!fileName) {
		throw new Error('Path is invalid.');
	}

	let directory = await navigator.storage.getDirectory();
	for (const segment of segments) {
		// eslint-disable-next-line no-await-in-loop
		directory = await directory.getDirectoryHandle(segment, { create });
	}

	return directory.getFileHandle(fileName, { create });
}
