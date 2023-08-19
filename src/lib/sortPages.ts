import type { FilesArrayObject } from './archive';

export function sortPagesCoverFirst(fileA: FilesArrayObject, fileB: FilesArrayObject) {
	return fileA.file.name.localeCompare(fileB.file.name);
}
