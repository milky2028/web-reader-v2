// End-to-end: the reader on a desktop in landscape and on a touch tablet, touch target sizes, and
// the light/dark theme. Run with `pnpm build && pnpm test:e2e`.
import assert from 'node:assert/strict';
import { setTimeout as sleep } from 'node:timers/promises';
import { after, afterEach, before, test } from 'node:test';
import { startApp } from './lib/app.mjs';
import { launchChrome } from './lib/chrome.mjs';
import { colorKey, makeFixtures, PAGES } from './lib/fixtures.mjs';
import { shownColors, waitForReader } from './lib/helpers.mjs';

/** Lenovo Legion Tab 8 in portrait, in CSS pixels. */
const TABLET = { width: 800, height: 1280, mobile: true };

let app;
let fixtures;
let page;

before(async () => {
	app = await startApp();
	fixtures = makeFixtures();
});
after(() => app.close());
afterEach(async () => {
	assert.deepEqual(page.errors, [], 'no uncaught errors in the page');
	await page.close();
});

async function openBook(viewport) {
	page = await launchChrome();
	await page.setViewport(viewport);
	await page.goto(`${app.url}/`);
	await page.chooseFiles([fixtures.deflate]);
	await waitForReader(page, `1 of ${PAGES.length}`);
}

const color = (index) => colorKey(PAGES[index].color);
const toolbarVisible = () =>
	page.evaluate(`document.querySelector('.reader header').classList.contains('visible')`);

test('pairs pages in landscape but keeps the cover, spreads, and the last page alone', async () => {
	await openBook({ width: 1280, height: 800 });
	assert.deepEqual(await shownColors(page), [color(0)], 'cover alone');

	await page.keyPress('ArrowRight');
	await waitForReader(page, '2–3 of 6');
	assert.deepEqual(await shownColors(page), [color(1), color(2)], 'pages 2 and 3 side by side');

	await page.keyPress('ArrowRight');
	await waitForReader(page, '4 of 6');
	assert.deepEqual(await shownColors(page), [color(3)], 'page 4 alone because page 5 is a spread');

	await page.keyPress('ArrowRight');
	await waitForReader(page, '5 of 6');
	assert.deepEqual(await shownColors(page), [color(4)], 'the spread alone');

	await page.keyPress('ArrowRight');
	await waitForReader(page, '6 of 6');
	assert.deepEqual(await shownColors(page), [color(5)], 'last page alone');

	await page.keyPress('ArrowLeft');
	await waitForReader(page, '5 of 6');
});

test('on a tablet: taps and swipes turn pages, the middle toggles the toolbar', async () => {
	await openBook(TABLET);
	const { width, height } = TABLET;
	const middle = height / 2;

	assert.equal(await toolbarVisible(), true, 'toolbar shows when the book opens');
	await sleep(3300);
	assert.equal(await toolbarVisible(), false, 'then hides itself');

	await page.tap(width / 2, middle);
	await page.waitFor(`document.querySelector('.reader header').classList.contains('visible')`);

	await page.tap(width * 0.9, middle);
	await waitForReader(page, '2 of 6');
	assert.equal(await toolbarVisible(), false, 'turning a page hides the toolbar');

	await page.tap(width * 0.1, middle);
	await waitForReader(page, '1 of 6');

	await page.swipe({ x: width * 0.8, y: middle }, { x: width * 0.2, y: middle });
	await waitForReader(page, '2 of 6');

	await page.swipe({ x: width * 0.2, y: middle }, { x: width * 0.8, y: middle });
	await waitForReader(page, '1 of 6');
});

test('every button and link is at least 48 CSS px on a touch screen', async () => {
	const tooSmall = `[...document.querySelectorAll('a, button')]
		.filter((element) => element.checkVisibility())
		.map((element) => ({ text: element.textContent.trim() || element.getAttribute('aria-label'), ...element.getBoundingClientRect().toJSON() }))
		.filter(({ width, height }) => width < 48 || height < 48)
		.map(({ text, width, height }) => \`\${text}: \${Math.round(width)}x\${Math.round(height)}\`)`;

	await openBook(TABLET);
	assert.deepEqual(await page.evaluate(tooSmall), [], 'reader toolbar');

	await page.goto(`${app.url}/books`);
	await page.waitFor(`document.querySelectorAll('main li').length === 1`);
	// Book cards are large tap targets by design; check the controls around them.
	assert.deepEqual(
		(await page.evaluate(tooSmall)).filter((entry) => !entry.startsWith('Deflate Book')),
		[],
		'library'
	);
});

test('follows the system light/dark setting without a reload', async () => {
	page = await launchChrome();
	await page.goto(`${app.url}/`);
	const background = () => page.evaluate(`getComputedStyle(document.body).backgroundColor`);

	await page.setColorScheme('dark');
	assert.equal(await background(), 'rgb(18, 18, 18)');
	await page.setColorScheme('light');
	assert.equal(await background(), 'rgb(255, 255, 255)');
});
