import type { BookDetails } from '$lib/stores/books';
import { getFile } from './getFile';
import { MANIFEST_NAME } from './writeManifest';

export async function getManifest() {
	const file = await getFile(`/${MANIFEST_NAME}`);
	const fileContents = await file.text();
	const json: [string, BookDetails][] = JSON.parse(fileContents);

	return new Map(json);
}
