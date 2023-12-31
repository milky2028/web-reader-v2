export function getFileNameFromPath(path: string) {
	const segments = path.split('/');
	return segments.pop() ?? '';
}
