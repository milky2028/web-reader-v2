/** Deletes a file or directory (recursively) from OPFS. Missing paths are not an error. */
export async function removePath(path: string) {
	const segments = path.split('/').filter(Boolean);
	const name = segments.pop();
	if (!name) {
		return;
	}

	try {
		let directory = await navigator.storage.getDirectory();
		for (const segment of segments) {
			// eslint-disable-next-line no-await-in-loop -- each level depends on the previous one
			directory = await directory.getDirectoryHandle(segment);
		}

		await directory.removeEntry(name, { recursive: true });
	} catch (error) {
		if (!(error instanceof DOMException && error.name === 'NotFoundError')) {
			throw error;
		}
	}
}
