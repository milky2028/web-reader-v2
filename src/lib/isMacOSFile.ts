import type { FilesArrayObject } from './archive';

export function isMacOSFile(obj: FilesArrayObject) {
	return !obj.path.includes('MACOS');
}
