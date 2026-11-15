/// <reference lib="WebWorker" />

import { isPagePath, sortPagePaths, storedPageName } from '#lib/archive-paths.ts';
import { writeFileSync } from '#lib/filesystem/writeFile.ts';
import { makeThumbnail, thumbnailPath } from '#lib/thumbnail.ts';
import init, { type ArchiveSource, type ExtractModule } from 'extract-zip-rar';
import wasmUrl from 'extract-zip-rar/wasm?url';
import type { ExtractMessage, ExtractRequest, FailureReason } from './protocol.ts';

declare global {
	var wasmURL: string;
}

class ExtractionFailure extends Error {
	constructor(
		readonly reason: FailureReason,
		message: string
	) {
		super(message);
	}
}

/** Cover plus the first two-page spread. */
const FIRST_PAGES = 3;

globalThis.wasmURL = wasmUrl;
const wasmReady = init();

const post = (message: ExtractMessage) => self.postMessage(message);

/**
 * Lets libarchive read the user's File in slices, on demand: the archive is never copied into
 * memory, which is what makes multi-gigabyte books work. libarchive seeks around in it, so listing
 * a zip only reads its headers.
 */
function fileSource(file: File): ArchiveSource {
	const reader = new FileReaderSync();
	return {
		size: file.size,
		read(offset, length) {
			try {
				return new Uint8Array(reader.readAsArrayBuffer(file.slice(offset, offset + length)));
			} catch {
				return null; // e.g. the file changed on disk; libarchive turns this into an error
			}
		}
	};
}

/** Iterates entries of a freshly opened archive, closing it when done. */
function* entries(wasm: ExtractModule, source: ArchiveSource) {
	const handle = wasm.open_archive(source);
	if (handle === 0) {
		throw new ExtractionFailure('open', wasm.last_open_error() || 'Could not open the archive');
	}

	try {
		for (;;) {
			const entry = wasm.next_entry(handle);
			if (entry === null) {
				return;
			}

			if ('error' in entry) {
				throw new ExtractionFailure('read', entry.error);
			}

			yield { entry, handle };
		}
	} finally {
		wasm.close_archive(handle);
	}
}

async function extract(wasm: ExtractModule, { file, directory }: ExtractRequest) {
	const source = fileSource(file);

	// Pass 1: headers only. Cheap for zip (the central directory is read once, entries are seeked
	// past) and for non-solid RAR; it tells us the reading order before any page is written.
	const sourcePaths: string[] = [];
	for (const { entry } of entries(wasm, source)) {
		if (entry.isFile && isPagePath(entry.path)) {
			sourcePaths.push(entry.path);
		}
	}

	if (sourcePaths.length === 0) {
		throw new ExtractionFailure('no-pages', 'No page images were found in this archive');
	}

	const readingOrder = sortPagePaths(sourcePaths);
	const indexOf = new Map(readingOrder.map((path, index) => [path, index]));
	const pages = readingOrder.map((path, index) => storedPageName(index, path));
	post({ type: 'listed', pages });

	const saved = new Set<number>();
	async function save(index: number, data: Uint8Array) {
		const pageName = pages[index] ?? '';
		try {
			await writeFileSync(`${directory}/${pageName}`, data);
		} catch (error) {
			throw new ExtractionFailure('write', `Could not save page ${pageName}: ${error}`);
		}

		saved.add(index);
		post({ type: 'page', index });

		if (index === 0) {
			// The library grid uses this instead of decoding the full-size cover.
			try {
				const thumbnail = await makeThumbnail(new Blob([data as Uint8Array<ArrayBuffer>]));
				if (thumbnail) await writeFileSync(thumbnailPath(directory, 0), thumbnail);
			} catch {
				// A missing thumbnail falls back to the full page.
			}
		}
	}

	async function extractPages(wanted: (index: number) => boolean, stopWhen: () => boolean) {
		for (const { entry, handle } of entries(wasm, source)) {
			const index = entry.isFile ? indexOf.get(entry.path) : undefined;
			if (index === undefined || saved.has(index) || !wanted(index)) {
				continue; // libarchive skips unread data; for zip that is just a seek
			}

			const data = wasm.read_entry(handle);
			if (data instanceof Uint8Array) {
				// eslint-disable-next-line no-await-in-loop -- one page in memory at a time, on purpose
				await save(index, data);
			} else {
				saved.add(index);
				post({ type: 'page-failed', index });
			}

			if (stopWhen()) return;
		}
	}

	// Pass 2: the first pages in reading order, so the reader can open right away even when an
	// archive stores its pages out of order (seen in the wild: the cover at entry 953 of 1038).
	const priority = Math.min(FIRST_PAGES, pages.length);
	await extractPages(
		(index) => index < priority,
		() => [...Array(priority).keys()].every((index) => saved.has(index))
	);

	// Pass 3: everything else, in archive order (the only order libarchive can stream in).
	await extractPages(
		() => true,
		() => false
	);

	post({ type: 'done' });
}

const fail = (reason: FailureReason, error: unknown) =>
	post({ type: 'error', reason, message: error instanceof Error ? error.message : String(error) });

// A rejected promise inside a worker does NOT fire the Worker's `error` event on the page, so
// without this an unexpected exception would leave the UI waiting forever.
self.addEventListener('unhandledrejection', (event) => {
	event.preventDefault();
	fail('crash', event.reason);
});

self.addEventListener('message', async ({ data: request }: MessageEvent<ExtractRequest>) => {
	let wasm: ExtractModule;
	try {
		wasm = await wasmReady;
	} catch (error) {
		fail('crash', `Could not load the extractor: ${error}`);
		return;
	}

	try {
		await extract(wasm, request);
	} catch (error) {
		fail(error instanceof ExtractionFailure ? error.reason : 'crash', error);
	}
});
