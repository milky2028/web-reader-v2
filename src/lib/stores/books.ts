import { browser } from '$app/environment';
import { getManifest } from '$lib/filesystem/getManifest';
import { writeManifest } from '$lib/filesystem/writeManifest';
import { writable } from 'svelte/store';

export type BookDetails = {
	path: string;
	pages: string[];
	coverName: string;
	lastPage: number;
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

	function updateLastPage(bookName: string, lastPage: number) {
		update(($books) => {
			const details = $books.get(bookName);

			if (details) {
				$books.set(bookName, { ...details, lastPage });
			}

			return $books;
		});
	}

	function remove(bookName: string) {
		update(($books) => {
			const book = $books.get(bookName);
			if (book) {
				$books.delete(bookName);
			}

			return $books;
		});
	}

	function reset() {
		update(() => {
			return new Map<string, BookDetails>();
		});
	}

	return { subscribe, add, updateLastPage, remove, reset };
}

export const books = createBookStore();
