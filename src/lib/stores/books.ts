import { browser } from '$app/env';
import { readManifest, writeManifest } from '#lib/filesystem/manifest.ts';
import { removePath } from '#lib/filesystem/removePath.ts';
import { forgetBook } from '#lib/pages.ts';
import { get, writable } from 'svelte/store';

export type BookDetails = {
	/** OPFS directory holding the pages. */
	path: string;
	/** Stored page file names in reading order. */
	pages: string[];
	coverName: string;
	lastPage: number;
	/** false while extracting or if extraction stopped part-way. Missing on books from older versions. */
	complete?: boolean;
};

function createBookStore() {
	const store = writable(new Map<string, BookDetails>());
	const { subscribe, update } = store;

	/** Resolves once the saved library has been read, so pages can tell "missing" from "not loaded yet". */
	const loaded = browser
		? readManifest().then((manifest) => {
				// Keep anything added before the manifest finished loading.
				update(($books) => new Map([...manifest, ...$books]));
			})
		: Promise.resolve();

	function change(mutate: ($books: Map<string, BookDetails>) => void) {
		update(($books) => {
			const next = new Map($books);
			mutate(next);
			void writeManifest(next);
			return next;
		});
	}

	function add(bookName: string, details: BookDetails) {
		change(($books) => $books.set(bookName, details));
	}

	function patch(bookName: string, details: Partial<BookDetails>) {
		change(($books) => {
			const current = $books.get(bookName);
			if (current) {
				$books.set(bookName, { ...current, ...details });
			}
		});
	}

	const updateLastPage = (bookName: string, lastPage: number) => patch(bookName, { lastPage });
	const markComplete = (bookName: string) => patch(bookName, { complete: true });

	/** Removes a book and deletes its pages from storage. */
	async function remove(bookName: string) {
		const book = get(store).get(bookName);
		change(($books) => $books.delete(bookName));
		forgetBook(bookName);
		if (book) {
			await removePath(book.path);
		}
	}

	/** Removes every book, its pages, and the saved library. */
	async function removeAll() {
		for (const bookName of get(store).keys()) {
			forgetBook(bookName);
		}

		change(($books) => $books.clear());
		await removePath('/books');
	}

	return { subscribe, loaded, add, updateLastPage, markComplete, remove, removeAll };
}

export const books = createBookStore();
