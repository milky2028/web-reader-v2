import type { BookDetails } from '$lib/stores/books';
import { writeFile } from './writeFile';

export const MANIFEST_NAME = 'book-manifest.json';

export function writeManifest(manifest: Map<string, BookDetails>) {
	const entries = Array.from(manifest);
	const file = new File([JSON.stringify(entries)], MANIFEST_NAME, { type: 'application/json' });
	return writeFile(`/${MANIFEST_NAME}`, file);
}
