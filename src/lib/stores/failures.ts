import { writable } from 'svelte/store';

export type Failure = { id: number; name: string; message: string };

let nextId = 0;
const { subscribe, update } = writable<Failure[]>([]);

/** Problems adding books, shown in a banner until dismissed. */
export const failures = {
	subscribe,
	report: (name: string, message: string) =>
		update(($failures) => [...$failures, { id: nextId++, name, message }]),
	dismiss: (id: number) => update(($failures) => $failures.filter((failure) => failure.id !== id))
};
