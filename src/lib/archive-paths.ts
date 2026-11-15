const IMAGE_EXTENSION = /\.(jpe?g|png|webp|gif|avif)$/i;
const ARCHIVE_EXTENSION = /\.(cbz|cbr|zip|rar)$/i;

/** True for page images, false for metadata, folders and macOS junk (`__MACOSX/`, `._file.jpg`). */
export function isPagePath(path: string) {
	const segments = path.split('/');
	const fileName = segments.at(-1) ?? '';
	return (
		IMAGE_EXTENSION.test(fileName) &&
		!fileName.startsWith('.') &&
		!segments.some((segment) => segment.toLowerCase() === '__macosx')
	);
}

/** True for files the app can open. Skips macOS `._` resource-fork files. */
export function isArchiveFile(fileName: string) {
	return ARCHIVE_EXTENSION.test(fileName) && !fileName.startsWith('._');
}

/** "Saga Vol. 1.cbz" -> "Saga Vol. 1" */
export function bookNameFromFileName(fileName: string) {
	return fileName.replace(ARCHIVE_EXTENSION, '').trim() || fileName;
}

const collator = new Intl.Collator('en-US', { numeric: true, sensitivity: 'base' });

/** Reading order: natural sort on the full path, so folders and "page 2" < "page 10" work. */
export function sortPagePaths(paths: string[]) {
	return [...paths].sort(collator.compare);
}

/** Stored file name for the page at `index`, e.g. "00042.jpg". Never collides, always URL-safe. */
export function storedPageName(index: number, sourcePath: string) {
	const extension = sourcePath.match(IMAGE_EXTENSION)?.[0].toLowerCase() ?? '';
	return `${String(index).padStart(5, '0')}${extension}`;
}
