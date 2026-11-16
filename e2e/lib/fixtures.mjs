// Builds small but realistic comic archives for the end-to-end tests: solid-color PNG pages (so a
// test can tell which page is on screen by sampling a pixel), nested folders, natural-sort traps,
// a landscape spread, macOS junk, and a cover stored *last* in the archive.
import { execFileSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { crc32, deflateSync } from 'node:zlib';

/** A solid-color RGB PNG. */
export function png(width, height, [r, g, b]) {
	const row = Buffer.alloc(1 + width * 3);
	for (let x = 0; x < width; x++) row.set([r, g, b], 1 + x * 3);
	const pixels = Buffer.concat(Array.from({ length: height }, () => row));

	const chunk = (type, data) => {
		const body = Buffer.concat([Buffer.from(type, 'ascii'), data]);
		const length = Buffer.alloc(4);
		length.writeUInt32BE(data.length);
		const checksum = Buffer.alloc(4);
		checksum.writeUInt32BE(crc32(body));
		return Buffer.concat([length, body, checksum]);
	};

	const header = Buffer.alloc(13);
	header.writeUInt32BE(width, 0);
	header.writeUInt32BE(height, 4);
	header[8] = 8; // bit depth
	header[9] = 2; // RGB
	return Buffer.concat([
		Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
		chunk('IHDR', header),
		chunk('IDAT', deflateSync(pixels)),
		chunk('IEND', Buffer.alloc(0))
	]);
}

/** Pages in reading order. Natural sort must put "02" before "10", and folders in order. */
export const PAGES = [
	{ path: 'Chapter 1/01.png', color: [220, 20, 60] },
	{ path: 'Chapter 1/02.png', color: [30, 144, 255] },
	{ path: 'Chapter 1/10.png', color: [50, 205, 50] },
	{ path: 'Chapter 2/01.png', color: [255, 165, 0] }, // same file name as the cover, other folder
	{ path: 'Chapter 2/02-03 spread.png', color: [148, 0, 211], spread: true },
	{ path: 'Chapter 2/04.png', color: [0, 206, 209] }
];

/** Order the files are added to the archive: the cover goes last. */
const ARCHIVE_ORDER = [5, 2, 3, 4, 1, 0];

export const colorKey = (color) => color.join(',');

export function makeFixtures() {
	const dir = mkdtempSync(join(tmpdir(), 'comic-reader-fixtures-'));
	const source = join(dir, 'source');

	const write = (path, data) => {
		mkdirSync(dirname(join(source, path)), { recursive: true });
		writeFileSync(join(source, path), data);
	};

	for (const page of PAGES) {
		write(page.path, page.spread ? png(1200, 900, page.color) : png(600, 900, page.color));
	}
	// Junk real archives contain: a macOS resource fork that *looks* like a page, and metadata.
	write('__MACOSX/Chapter 1/._01.png', Buffer.from([0x00, 0x05, 0x16, 0x07, 0, 0, 0, 0]));
	write('ComicInfo.xml', '<ComicInfo><Title>Fixture</Title></ComicInfo>');

	const entries = [
		...ARCHIVE_ORDER.map((index) => PAGES[index].path),
		'__MACOSX/Chapter 1/._01.png',
		'ComicInfo.xml'
	];
	const zip = (name, level) => {
		const path = join(dir, name);
		execFileSync('zip', ['-q', level, path, ...entries], { cwd: source });
		return path;
	};

	const corrupt = join(dir, 'Corrupt Book.cbz');
	writeFileSync(corrupt, Buffer.alloc(8192, 7));
	const notes = join(dir, 'notes.txt');
	writeFileSync(notes, 'not a comic');

	return {
		dir,
		deflate: zip('Deflate Book.cbz', '-9'),
		stored: zip('Stored Book.cbz', '-0'),
		corrupt,
		notes
	};
}
