import { writable } from 'svelte/store';

function createProgressStore() {
	const { update, subscribe, set } = writable({ current: 0, outOf: 0 });

	function clear() {
		set({ current: 0, outOf: 0 });
	}

	function reset() {
		update(({ outOf }) => ({ outOf, current: 0 }));
	}

	function updateTotal(total: number) {
		update(({ outOf }) => ({ current: 0, outOf: total + outOf }));
	}

	function increment() {
		update(({ current, outOf }) => ({ current: current + 1, outOf }));
	}

	return { subscribe, reset, updateTotal, increment, clear };
}

export const progress = createProgressStore();
