import type { BookDetails } from '#lib/stores/books.ts';
import { getFile } from './getFile.ts';
import { removePath } from './removePath.ts';
import { writeFile } from './writeFile.ts';

export const MANIFEST_PATH = '/book-manifest.json';

export async function readManifest() {
	try {
		const file = await getFile(MANIFEST_PATH);
		const entries: [string, BookDetails][] = JSON.parse(await file.text());
		return new Map(entries);
	} catch {
		return new Map<string, BookDetails>();
	}
}

// Writes are chained so two quick updates can never interleave or land out of order.
let lastWrite: Promise<unknown> = Promise.resolve();

export function writeManifest(manifest: Map<string, BookDetails>) {
	const json = JSON.stringify([...manifest]);
	lastWrite = lastWrite
		.catch(() => undefined)
		.then(() =>
			manifest.size === 0
				? removePath(MANIFEST_PATH)
				: writeFile(MANIFEST_PATH, new Blob([json], { type: 'application/json' }))
		);
	return lastWrite;
}
