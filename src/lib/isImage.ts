import type { FilesArrayObject } from './archive';

export function isImage({ file }: FilesArrayObject) {
	return file.name.endsWith('.jpg') || file.name.endsWith('.jpeg') || file.name.endsWith('.png');
}
