import type { VectorOfStrings } from 'extract-zip-rar/dist/extract';

export function vectorToArray<T>(vector: VectorOfStrings) {
	const array: T[] = [];
	for (let i = 0; i < vector.size(); i++) {
		array.push(vector.get(i));
	}
	return array;
}
