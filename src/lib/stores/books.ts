import { writable } from 'svelte/store';

type BookDetails = {
	path: string;
	pages: string[];
};

function createBookStore() {
	const { subscribe, update } = writable(new Map<string, BookDetails>());

	function add(bookName: string, details: BookDetails) {
		update(($books) => {
			$books.set(bookName, details);
			return $books;
		});
	}

	return { subscribe, add };
}

export const books = createBookStore();
