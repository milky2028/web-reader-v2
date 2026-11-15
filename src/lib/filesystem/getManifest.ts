import type { BookDetails } from '#lib/stores/books.ts';
import { getFile } from './getFile';
import { MANIFEST_NAME } from './writeManifest';

export async function getManifest() {
	try {
		const file = await getFile(`/${MANIFEST_NAME}`);
		const fileContents = await file.text();
		const json: [string, BookDetails][] = JSON.parse(fileContents);
		return new Map(json);
	} catch {
		return new Map();
	}
}
