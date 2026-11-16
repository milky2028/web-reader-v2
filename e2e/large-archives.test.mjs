// Opt-in end-to-end check with your own big archives (this is how the >2 GB fix was verified):
//
//   pnpm build && E2E_ARCHIVES="/path/a.cbz:/path/b.cbr" pnpm test:e2e
//
// Each archive is picked through the real file input (a disk-backed File, like on a tablet) in a
// fresh browser. Reports how fast the book is listed, when page 1 appears, total extraction time,
// and the browser's peak memory, then checks every page landed in storage.
//
// Archives on a network share list slowly: libarchive visits every entry's local header, one
// random read each, and each costs a network round trip (~40 s for 1,038 entries over SMB).
import assert from 'node:assert/strict';
import { basename } from 'node:path';
import { setTimeout as sleep } from 'node:timers/promises';
import { after, before, test } from 'node:test';
import { startApp } from './lib/app.mjs';
import { launchChrome } from './lib/chrome.mjs';
import { storedFiles } from './lib/helpers.mjs';

const archives = (process.env.E2E_ARCHIVES ?? '').split(':').filter(Boolean);

let app;
before(async () => {
	if (archives.length > 0) app = await startApp();
});
after(() => app?.close());

test('large archives (set E2E_ARCHIVES to run)', { skip: archives.length === 0 }, async (t) => {
	for (const archive of archives) {
		await t.test(basename(archive), { timeout: 30 * 60_000 }, async () => {
			const page = await launchChrome();
			try {
				await page.setViewport({ width: 1280, height: 800 });
				await page.goto(`${app.url}/`);
				await sleep(500);
				const baseline = page.rendererMemoryMB();

				const started = Date.now();
				await page.chooseFiles([archive]);

				let listed;
				let firstPage;
				let peak = baseline;
				for (;;) {
					await sleep(250);
					peak = Math.max(peak, page.rendererMemoryMB());
					const state = await page.evaluate(`({
						extracting: !!document.querySelector('progress'),
						shown: [...document.querySelectorAll('.pages img')].some((image) => image.complete && image.naturalWidth > 0),
						failure: document.querySelector('.failures')?.textContent ?? null
					})`);
					assert.equal(state.failure, null);
					const elapsed = Date.now() - started;
					if (state.extracting) listed ??= elapsed;
					if (state.shown) firstPage ??= elapsed;
					if (firstPage !== undefined && !state.extracting) break;
				}
				const total = Date.now() - started;

				const { pages, path } = await page.evaluate(`(async () => {
					const root = await navigator.storage.getDirectory();
					const manifest = JSON.parse(await (await (await root.getFileHandle('book-manifest.json')).getFile()).text());
					const [, book] = manifest[0];
					return { pages: book.pages.length, path: book.path };
				})()`);
				const onDisk = (await storedFiles(page)).filter(
					(file) => file.startsWith(`${path}/`) && !file.includes('/thumbs/')
				).length;

				t.diagnostic(
					`${basename(archive)}: ${pages} pages, listed ${listed ?? '-'} ms, page 1 after ${firstPage} ms, ` +
						`all pages after ${(total / 1000).toFixed(1)} s, peak memory +${peak - baseline} MB`
				);

				assert.equal(onDisk, pages, 'every page is in storage');
				// The point of the app: start reading while the rest extracts. Only meaningful when
				// extraction takes a while.
				if (total > 10_000) {
					assert.ok(
						firstPage < total / 2,
						`page 1 should show long before extraction finishes (page 1 after ${firstPage} ms of ${total} ms; book listed after ${listed} ms)`
					);
				}
			} finally {
				await page.close();
			}
		});
	}
});
