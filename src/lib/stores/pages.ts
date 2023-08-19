import { writable } from 'svelte/store';

function createPageStore() {
	const { subscribe, update } = writable(new Map<string, string>());

	function add(pageName: string, url: string) {
		update(($pages) => {
			$pages.set(pageName, url);
			return $pages;
		});
	}

	return { subscribe, add };
}

export const pages = createPageStore();
