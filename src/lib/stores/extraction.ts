import { derived, writable } from 'svelte/store';

type Extraction = { total: number; settled: Set<number>; failed: Set<number> };

const active = writable(new Map<string, Extraction>());
const waiters = new Map<string, Map<number, (() => void)[]>>();

/** Overall progress across every book currently being extracted. */
export const progress = derived(active, ($active) => {
	let current = 0;
	let outOf = 0;
	for (const { total, settled } of $active.values()) {
		current += settled.size;
		outOf += total;
	}

	return { current, outOf };
});

/** Books still being extracted (a page might not be on disk yet). */
export const extracting = derived(active, ($active) => new Set($active.keys()));

function settle(bookName: string, index: number, failed: boolean) {
	active.update(($active) => {
		const extraction = $active.get(bookName);
		extraction?.settled.add(index);
		if (failed) {
			extraction?.failed.add(index);
		}

		return new Map($active);
	});

	const bookWaiters = waiters.get(bookName);
	bookWaiters?.get(index)?.forEach((resolve) => resolve());
	bookWaiters?.delete(index);
}

export const extraction = {
	start(bookName: string, total: number) {
		active.update(($active) =>
			new Map($active).set(bookName, { total, settled: new Set(), failed: new Set() })
		);
	},
	pageReady: (bookName: string, index: number) => settle(bookName, index, false),
	pageFailed: (bookName: string, index: number) => settle(bookName, index, true),
	/** Extraction ended (finished or failed): release anything still waiting. */
	finish(bookName: string) {
		active.update(($active) => {
			const next = new Map($active);
			next.delete(bookName);
			return next;
		});

		waiters.get(bookName)?.forEach((resolvers) => resolvers.forEach((resolve) => resolve()));
		waiters.delete(bookName);
	}
};

let snapshot = new Map<string, Extraction>();
active.subscribe(($active) => (snapshot = $active));

/** Resolves once page `index` of `bookName` is on disk (immediately if it is not being extracted). */
export function waitForPage(bookName: string, index: number) {
	const current = snapshot.get(bookName);
	if (!current || current.settled.has(index)) {
		return Promise.resolve();
	}

	return new Promise<void>((resolve) => {
		const bookWaiters = waiters.get(bookName) ?? new Map<number, (() => void)[]>();
		waiters.set(bookName, bookWaiters);
		bookWaiters.set(index, [...(bookWaiters.get(index) ?? []), resolve]);
	});
}
