import { getFile } from '#lib/filesystem/getFile.ts';
import { writeFile } from '#lib/filesystem/writeFile.ts';
import { waitForPage } from '#lib/stores/extraction.ts';
import type { BookDetails } from '#lib/stores/books.ts';
import { makeThumbnail, thumbnailPath } from '#lib/thumbnail.ts';

/** Full-size page object URLs are cached per book *and* page, and capped to bound memory. */
const MAX_PAGE_URLS = 16;
const pageUrls = new Map<string, Promise<string | undefined>>();
const thumbnailUrls = new Map<string, Promise<string | undefined>>();
const spreads = new Map<string, boolean>();

const keyOf = (bookName: string, index: number) => `${bookName}\u0000${index}`;

function revoke(url: Promise<string | undefined> | undefined) {
	void url?.then((resolved) => resolved && URL.revokeObjectURL(resolved));
}

async function fileUrl(path: string) {
	try {
		return URL.createObjectURL(await getFile(path));
	} catch {
		return undefined;
	}
}

/** Object URL for a page, waiting for it if it is still being extracted. undefined if missing. */
export function getPageUrl(bookName: string, book: BookDetails, index: number) {
	if (index < 0 || index >= book.pages.length) {
		return Promise.resolve(undefined);
	}

	const key = keyOf(bookName, index);
	const cached = pageUrls.get(key);
	if (cached) {
		// Refresh its position in the LRU order.
		pageUrls.delete(key);
		pageUrls.set(key, cached);
		return cached;
	}

	const url = waitForPage(bookName, index).then(() => fileUrl(`${book.path}/${book.pages[index]}`));
	pageUrls.set(key, url);
	// Don't cache a miss: the page may still arrive (e.g. a retry).
	void url.then((resolved) => resolved ?? (pageUrls.get(key) === url && pageUrls.delete(key)));

	for (const [oldKey, oldUrl] of pageUrls) {
		if (pageUrls.size <= MAX_PAGE_URLS) break;
		pageUrls.delete(oldKey);
		revoke(oldUrl);
	}

	return url;
}

/** Whether a page is a landscape two-page spread. Decodes the page once, then remembers. */
export async function isSpread(bookName: string, book: BookDetails, index: number) {
	const key = keyOf(bookName, index);
	const known = spreads.get(key);
	if (known !== undefined) {
		return known;
	}

	const url = await getPageUrl(bookName, book, index);
	if (!url) {
		return false;
	}

	const image = new Image();
	image.src = url;
	try {
		await image.decode();
	} catch {
		return false;
	}

	const spread = image.naturalWidth > image.naturalHeight;
	spreads.set(key, spread);
	return spread;
}

// At most two full-size decodes at a time while building thumbnails.
let running = 0;
const queued: (() => void)[] = [];
async function limited<T>(task: () => Promise<T>) {
	if (running >= 2) {
		await new Promise<void>((resolve) => queued.push(resolve));
	}

	running++;
	try {
		return await task();
	} finally {
		running--;
		queued.shift()?.();
	}
}

/** Small cached thumbnail for grids. Generated (and saved) on first use, so it is cheap later. */
export function getThumbnailUrl(bookName: string, book: BookDetails, index: number) {
	const key = keyOf(bookName, index);
	const cached = thumbnailUrls.get(key);
	if (cached) {
		return cached;
	}

	const path = thumbnailPath(book.path, index);
	const url = fileUrl(path).then(
		(existing) =>
			existing ??
			limited(async () => {
				await waitForPage(bookName, index);
				const page = await getFile(`${book.path}/${book.pages[index]}`).catch(() => undefined);
				if (!page) {
					return undefined;
				}

				const thumbnail = await makeThumbnail(page).catch(() => undefined);
				if (!thumbnail) {
					return URL.createObjectURL(page);
				}

				await writeFile(path, thumbnail).catch(() => undefined);
				return (await fileUrl(path)) ?? URL.createObjectURL(thumbnail);
			})
	);

	thumbnailUrls.set(key, url);
	void url.then((resolved) => resolved ?? thumbnailUrls.delete(key));
	return url;
}

/** Drops cached URLs for a book (when it is removed or replaced). */
export function forgetBook(bookName: string) {
	const prefix = `${bookName}\u0000`;
	for (const cache of [pageUrls, thumbnailUrls]) {
		for (const [key, url] of cache) {
			if (key.startsWith(prefix)) {
				cache.delete(key);
				revoke(url);
			}
		}
	}

	for (const key of spreads.keys()) {
		if (key.startsWith(prefix)) spreads.delete(key);
	}
}
