import { readable } from 'svelte/store';

export const isLandscapeMode = readable(false, (set) => {
	if (typeof matchMedia === 'undefined') {
		return;
	}

	const query = matchMedia('(orientation: landscape)');
	const update = () => set(query.matches);
	update();
	query.addEventListener('change', update);
	return () => query.removeEventListener('change', update);
});
