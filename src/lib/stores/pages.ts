import { browser } from '$app/environment';
import { createPage } from '$lib/createPage';
import { writable, get } from 'svelte/store';
import type { BookDetails } from './books';

function createPageStore() {
	const { subscribe, update } = writable(new Map<string, string>());

	function add(pageName: string, url: string) {
		update(($pages) => {
			$pages.set(pageName, url);
			return $pages;
		});
	}

	async function getPage(
		$books: Map<string, BookDetails>,
		bookName: string,
		pageNameOrNumber: string | number
	) {
		if (browser) {
			let pageName = pageNameOrNumber;
			if (typeof pageName === 'number') {
				pageName = $books.get(bookName)?.pages[pageName] ?? '';
			}

			// eslint-disable-next-line no-use-before-define
			const $pages = get(pages);
			let url = $pages.get(pageName);
			if (!url) {
				try {
					url = await createPage(bookName, pageName);
					add(pageName, url);
					return url;
				} catch (e) {
					return '';
				}
			}

			return url;
		}

		return '';
	}

	return { subscribe, add, getPage };
}

export const pages = createPageStore();
