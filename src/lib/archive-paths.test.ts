import { describe, expect, it } from 'vitest';
import {
	bookNameFromFileName,
	isArchiveFile,
	isPagePath,
	sortPagePaths,
	storedPageName
} from './archive-paths.ts';

describe('isPagePath', () => {
	it.each(['001.jpg', 'a/B.JPEG', 'x/y/z.png', 'p.webp', 'p.gif', 'p.avif'])('accepts %s', (path) =>
		expect(isPagePath(path)).toBe(true)
	);

	it.each([
		'ComicInfo.xml',
		'folder/',
		'__MACOSX/001.jpg',
		'Book/__MACOSX/._001.jpg',
		'Book/._001.jpg',
		'thumbs.db',
		'001.jpg.txt'
	])('rejects %s', (path) => expect(isPagePath(path)).toBe(false));
});

describe('isArchiveFile', () => {
	it('is case-insensitive and anchored', () => {
		expect(isArchiveFile('BOOK.CBZ')).toBe(true);
		expect(isArchiveFile('book.cbr')).toBe(true);
		expect(isArchiveFile('xcbr')).toBe(false);
		expect(isArchiveFile('book.cbr.txt')).toBe(false);
	});

	it('skips macOS resource forks', () => expect(isArchiveFile('._book.cbz')).toBe(false));
});

describe('bookNameFromFileName', () => {
	it('drops only the archive extension and keeps everything else', () => {
		expect(bookNameFromFileName('Saga #1 (2012).cbz')).toBe('Saga #1 (2012)');
		expect(bookNameFromFileName('100% Done.CBR')).toBe('100% Done');
	});
});

describe('sortPagePaths', () => {
	it('sorts naturally across folders', () => {
		expect(
			sortPagePaths(['Ch 2/01.jpg', 'Ch 10/01.jpg', 'Ch 1/10.jpg', 'Ch 1/2.jpg', 'Ch 1/01.jpg'])
		).toEqual(['Ch 1/01.jpg', 'Ch 1/2.jpg', 'Ch 1/10.jpg', 'Ch 2/01.jpg', 'Ch 10/01.jpg']);
	});
});

describe('storedPageName', () => {
	it('keeps same-named pages from different folders distinct', () => {
		expect(storedPageName(0, 'Ch 1/01.JPG')).toBe('00000.jpg');
		expect(storedPageName(12, 'Ch 2/01.jpeg')).toBe('00012.jpeg');
	});
});
