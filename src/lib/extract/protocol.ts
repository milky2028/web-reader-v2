export type ExtractRequest = {
	file: File;
	/** OPFS directory the pages are written to, e.g. "/books/<uuid>". */
	directory: string;
};

export type FailureReason = 'open' | 'read' | 'no-pages' | 'write' | 'crash';

export type ExtractMessage =
	/** Header pass finished: stored page names in reading order. */
	| { type: 'listed'; pages: string[] }
	/** Page `index` (reading order) is written and can be displayed. */
	| { type: 'page'; index: number }
	/** Page `index` could not be read; the rest of the book is still extracted. */
	| { type: 'page-failed'; index: number }
	| { type: 'done' }
	| { type: 'error'; reason: FailureReason; message: string };
