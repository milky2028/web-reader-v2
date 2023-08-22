import { readable } from 'svelte/store';

export const isLandscapeMode = readable(globalThis.innerWidth > globalThis.innerHeight, (set) => {
	globalThis.addEventListener?.('resize', () =>
		set(globalThis.innerWidth > globalThis.innerHeight)
	);
});
