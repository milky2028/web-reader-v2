// Page-level helpers shared by the end-to-end tests.

/** Waits for the reader to settle on `position` (e.g. "3 of 6") with every page image decoded. */
export function waitForReader(page, position) {
	return page.waitFor(`(() => {
		const images = [...document.querySelectorAll('.pages img')];
		return document.querySelector('.position')?.textContent === ${JSON.stringify(position)} &&
			!document.querySelector('.pages.loading') &&
			images.length > 0 &&
			images.every((image) => image.complete && image.naturalWidth > 0);
	})()`);
}

/** The color of each page on screen ("r,g,b"), sampled from the decoded images. */
export function shownColors(page) {
	return page.evaluate(`[...document.querySelectorAll('.pages img')].map((image) => {
		const canvas = new OffscreenCanvas(1, 1);
		const context = canvas.getContext('2d');
		context.drawImage(image, 0, 0, 1, 1);
		return [...context.getImageData(0, 0, 1, 1).data.slice(0, 3)].join(',');
	})`);
}

/** Library cards: [{ name, meta }] once the library has loaded. */
export async function libraryCards(page) {
	await page.waitFor(`!document.querySelector('main')?.textContent.includes('Loading')`);
	return page.evaluate(`[...document.querySelectorAll('main li')].map((card) => ({
		name: card.querySelector('.title')?.textContent.trim(),
		meta: card.querySelector('.meta, .badge')?.textContent.trim()
	}))`);
}

/** Everything stored in OPFS, as "path size" lines. */
export function storedFiles(page) {
	return page.evaluate(`(async () => {
		const out = [];
		async function walk(directory, prefix) {
			for await (const [name, handle] of directory.entries()) {
				if (handle.kind === 'directory') await walk(handle, prefix + name + '/');
				else out.push(prefix + name);
			}
		}
		await walk(await navigator.storage.getDirectory(), '/');
		return out.sort();
	})()`);
}

/** Clicks the first element matching `selector` whose text includes `text` (or any match). */
export function click(page, selector, text = '') {
	return page.evaluate(`(() => {
		const element = [...document.querySelectorAll(${JSON.stringify(selector)})]
			.find((candidate) => candidate.textContent.includes(${JSON.stringify(text)}));
		if (!element) throw new Error('Nothing to click: ' + ${JSON.stringify(`${selector} ${text}`)});
		element.click();
	})()`);
}

/** Waits until the saved library (the manifest in OPFS) lists exactly `names`, all fully added. */
export function waitForSavedLibrary(page, names) {
	return page.waitFor(`(async () => {
		const root = await navigator.storage.getDirectory();
		let saved = [];
		try {
			const file = await (await root.getFileHandle('book-manifest.json')).getFile();
			saved = JSON.parse(await file.text());
		} catch {
			// no manifest: empty library
		}
		const savedNames = saved.filter(([, book]) => book.complete !== false).map(([name]) => name).sort();
		return saved.length === savedNames.length && JSON.stringify(savedNames) === ${JSON.stringify(JSON.stringify([...names].sort()))};
	})()`);
}
