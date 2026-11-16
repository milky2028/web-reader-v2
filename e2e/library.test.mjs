// End-to-end: adding books, reading order, errors, and the library surviving reloads.
// Run with `pnpm build && pnpm test:e2e`.
import assert from 'node:assert/strict';
import { after, afterEach, before, beforeEach, test } from 'node:test';
import { startApp } from './lib/app.mjs';
import { launchChrome } from './lib/chrome.mjs';
import { colorKey, makeFixtures, PAGES } from './lib/fixtures.mjs';
import {
	click,
	libraryCards,
	shownColors,
	storedFiles,
	waitForReader,
	waitForSavedLibrary
} from './lib/helpers.mjs';

let app;
let fixtures;
let page;

before(async () => {
	app = await startApp();
	fixtures = makeFixtures();
});
after(() => app.close());

beforeEach(async () => {
	page = await launchChrome();
	// Portrait, so the reader shows one page at a time.
	await page.setViewport({ width: 900, height: 1200 });
	await page.goto(`${app.url}/`);
});
afterEach(async () => {
	assert.deepEqual(page.errors, [], 'no uncaught errors in the page');
	await page.close();
});

test('opens a deflate CBZ at page 1 even when pages are stored out of order in folders', async () => {
	await page.chooseFiles([fixtures.deflate]);
	await page.waitFor(`location.pathname === '/book/Deflate%20Book/page/0'`);

	for (const [index, { color }] of PAGES.entries()) {
		await waitForReader(page, `${index + 1} of ${PAGES.length}`);
		assert.deepEqual(await shownColors(page), [colorKey(color)], `page ${index + 1}`);
		await page.keyPress('ArrowRight');
	}
});

test('reports unreadable files instead of hanging', async () => {
	await page.chooseFiles([fixtures.corrupt, fixtures.notes]);
	const failures = await page.waitFor(`(() => {
		const items = [...document.querySelectorAll('.failures p')].map((p) => p.textContent);
		return items.length === 2 && items;
	})()`);

	assert.match(
		failures.find((text) => text.includes('Corrupt Book.cbz')) ?? '',
		/couldn't be added/
	);
	assert.match(failures.find((text) => text.includes('notes.txt')) ?? '', /only \.cbz, \.cbr/);
	assert.equal(await page.evaluate('location.pathname'), '/');
	assert.equal(await page.evaluate(`!!document.querySelector('progress')`), false);
});

test('keeps the library across reloads, and removing books really deletes them', async () => {
	await page.chooseFiles([fixtures.deflate, fixtures.stored]);
	await page.waitFor(`location.pathname === '/books'`);
	await page.waitFor(
		`document.querySelectorAll('main li').length === 2 && !document.querySelector('progress')`
	);

	// Saving is asynchronous; reload only once each change has reached storage.
	await waitForSavedLibrary(page, ['Deflate Book', 'Stored Book']);
	await page.reload();
	assert.deepEqual(
		(await libraryCards(page)).map((card) => card.name),
		['Deflate Book', 'Stored Book']
	);
	// Covers are thumbnails (at most 400 px wide), not the 600 px pages.
	const coverWidths = await page.waitFor(`(() => {
		const images = [...document.querySelectorAll('.thumbnail img')];
		return images.length === 2 && images.every((image) => image.naturalWidth > 0) && images.map((image) => image.naturalWidth);
	})()`);
	assert.ok(
		coverWidths.every((width) => width <= 400),
		`cover widths ${coverWidths}`
	);

	await click(page, 'button.remove');
	await page.waitFor(`document.querySelectorAll('main li').length === 1`);
	await waitForSavedLibrary(page, ['Stored Book']);
	await page.reload();
	assert.deepEqual(
		(await libraryCards(page)).map((card) => card.name),
		['Stored Book']
	);

	await click(page, 'button', 'Remove all');
	await page.waitFor(`document.querySelector('main').textContent.includes('No books yet')`);
	await waitForSavedLibrary(page, []);
	await page.reload();
	await page.waitFor(`document.querySelector('main').textContent.includes('No books yet')`);
	assert.deepEqual(await storedFiles(page), [], 'nothing left in storage');
});

test('remembers the last page read', async () => {
	await page.chooseFiles([fixtures.deflate]);
	await waitForReader(page, `1 of ${PAGES.length}`);
	await page.keyPress('ArrowRight');
	await waitForReader(page, `2 of ${PAGES.length}`);
	await page.keyPress('ArrowRight');
	await waitForReader(page, `3 of ${PAGES.length}`);

	await page.goto(`${app.url}/books`);
	assert.deepEqual(await libraryCards(page), [
		{ name: 'Deflate Book', meta: `Page 3 of ${PAGES.length}` }
	]);
	assert.equal(
		await page.evaluate(`document.querySelector('main li a').pathname`),
		'/book/Deflate%20Book/page/2'
	);
});
