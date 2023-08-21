import { createPage } from '$lib/createPage';
import { writable, get } from 'svelte/store';

function createPageStore() {
	const { subscribe, update } = writable(new Map<string, string>());

	function add(pageName: string, url: string) {
		update(($pages) => {
			$pages.set(pageName, url);
			return $pages;
		});
	}

	function getPage(bookName: string, pageName: string) {
		// eslint-disable-next-line no-use-before-define
		const $pages = get(pages);
		const url = $pages.get(pageName);
		if (!url) {
			return createPage(bookName, pageName);
		}

		return url;
	}

	return { subscribe, add, getPage };
}

export const pages = createPageStore();
