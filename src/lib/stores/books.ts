import { browser } from '$app/environment';
import { getManifest } from '$lib/filesystem/getManifest';
import { writeManifest } from '$lib/filesystem/writeManifest';
import { writable } from 'svelte/store';

export type BookDetails = {
	path: string;
	pages: string[];
	coverName: string;
};

function createBookStore() {
	const { subscribe, update, set } = writable(new Map<string, BookDetails>());

	(async () => {
		if (browser) {
			const manifest = await getManifest();
			set(manifest);
		}
	})();

	subscribe(($books) => {
		if (browser) {
			writeManifest($books);
		}
	});

	function add(bookName: string, details: BookDetails) {
		update(($books) => {
			$books.set(bookName, details);
			return $books;
		});
	}

	return { subscribe, add };
}

export const books = createBookStore();
