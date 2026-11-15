import { countUploadFailure } from '#lib/analytics.ts';
import { bookNameFromFileName } from '#lib/archive-paths.ts';
import { removePath } from '#lib/filesystem/removePath.ts';
import { books } from '#lib/stores/books.ts';
import { extraction } from '#lib/stores/extraction.ts';
import { get } from 'svelte/store';
import type { ExtractMessage, ExtractRequest, FailureReason } from './protocol.ts';

export class ExtractionError extends Error {
	constructor(
		readonly reason: FailureReason,
		message: string
	) {
		super(message);
	}
}

// Books are extracted one at a time so several large uploads never compete for memory.
let queue: Promise<unknown> = Promise.resolve();

/**
 * Adds a book to the library. `firstPage` resolves as soon as page 1 can be shown (or rejects if
 * the book cannot be read); `finished` resolves when every page is extracted.
 */
export function addBook(file: File) {
	const bookName = bookNameFromFileName(file.name);
	let onFirstPage = () => {};
	let onFailure = (_error: ExtractionError) => {};
	const firstPage = new Promise<void>((resolve, reject) => {
		onFirstPage = resolve;
		onFailure = reject;
	});

	const finished = queue.then(() => extract(file, bookName, onFirstPage, onFailure));
	queue = finished.catch(() => undefined);
	// Rejections are surfaced through firstPage; avoid unhandled-rejection noise.
	finished.catch(() => undefined);

	return { bookName, firstPage, finished };
}

async function extract(
	file: File,
	bookName: string,
	onFirstPage: () => void,
	onFailure: (error: ExtractionError) => void
) {
	if (get(books).has(bookName)) {
		await books.remove(bookName); // re-adding a book replaces it
	}

	const directory = `/books/${crypto.randomUUID()}`;
	const worker = new Worker(new URL('./extract.worker.ts', import.meta.url), { type: 'module' });
	let listed = false;
	let shownFirstPage = false;
	let pagesWritten = 0;

	const showFirstPage = () => {
		shownFirstPage = true;
		onFirstPage();
	};

	await new Promise<void>((resolve, reject) => {
		function fail(reason: FailureReason, message: string) {
			worker.terminate();
			extraction.finish(bookName);
			countUploadFailure(file, reason);
			const error = new ExtractionError(reason, message);
			onFailure(error);
			if (!shownFirstPage) {
				// Nothing readable was produced: don't leave a broken book behind.
				if (listed) void books.remove(bookName);
				else void removePath(directory);
			}
			reject(error);
		}

		worker.addEventListener('error', (event) => {
			event.preventDefault();
			fail('crash', event.message || 'The extractor stopped unexpectedly (likely out of memory)');
		});
		worker.addEventListener('messageerror', () =>
			fail('crash', 'The extractor sent an unreadable message')
		);
		worker.addEventListener('message', ({ data: message }: MessageEvent<ExtractMessage>) => {
			switch (message.type) {
				case 'listed':
					listed = true;
					books.add(bookName, {
						path: directory,
						pages: message.pages,
						coverName: message.pages[0] ?? '',
						lastPage: 0,
						complete: false
					});
					extraction.start(bookName, message.pages.length);
					break;
				case 'page':
					pagesWritten++;
					extraction.pageReady(bookName, message.index);
					if (message.index === 0) showFirstPage();
					break;
				case 'page-failed':
					// The reader shows a placeholder for this page; the rest of the book is fine.
					extraction.pageFailed(bookName, message.index);
					if (message.index === 0) showFirstPage();
					break;
				case 'done':
					if (pagesWritten === 0) {
						shownFirstPage = false;
						fail('read', 'None of the pages could be read');
						return;
					}
					books.markComplete(bookName);
					extraction.finish(bookName);
					worker.terminate();
					resolve();
					break;
				case 'error':
					fail(message.reason, message.message);
					break;
			}
		});

		worker.postMessage({ file, directory } satisfies ExtractRequest);
	});
}
