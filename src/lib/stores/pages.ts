import { get, writable } from 'svelte/store';

function createPageStore() {
	const { subscribe, update } = writable(new Map<string, string>());

	function add(pageName: string, url: string) {
		update(($pages) => {
			$pages.set(pageName, url);
			return $pages;
		});
	}

	function getStaticPage(pageName: string) {
		// eslint-disable-next-line no-use-before-define
		const $pages = get(pages);
		return $pages.get(pageName);
	}

	return { subscribe, add, getStaticPage };
}

export const pages = createPageStore();
