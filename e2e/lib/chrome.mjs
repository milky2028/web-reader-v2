// Minimal headless Chrome driver over the DevTools Protocol, so the end-to-end tests need no
// browser-automation dependency. Every launch gets a throwaway profile.
import { spawn, execFileSync } from 'node:child_process';
import { existsSync, mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { setTimeout as sleep } from 'node:timers/promises';

function findChrome() {
	const candidates = [
		process.env.CHROME_PATH,
		'google-chrome-stable',
		'google-chrome',
		'chromium',
		'chromium-browser',
		'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'
	].filter(Boolean);
	for (const candidate of candidates) {
		if (candidate.startsWith('/') ? existsSync(candidate) : whichOk(candidate)) return candidate;
	}
	throw new Error('No Chrome/Chromium found. Install one or set CHROME_PATH.');
}

function whichOk(command) {
	try {
		execFileSync('which', [command], { stdio: 'ignore' });
		return true;
	} catch {
		return false;
	}
}

/** Resident memory of this browser's renderer processes (page + its workers), in MB. */
function rendererMemoryMB(profile) {
	const lines = execFileSync('ps', ['-eo', 'rss,args'], { encoding: 'utf8' }).split('\n');
	const kb = lines
		.filter((line) => line.includes(profile) && line.includes('--type=renderer'))
		.reduce((sum, line) => sum + Number(line.trim().split(/\s+/)[0]), 0);
	return Math.round(kb / 1024);
}

export async function launchChrome() {
	const profile = mkdtempSync(join(tmpdir(), 'comic-reader-e2e-'));
	const chrome = spawn(
		findChrome(),
		[
			'--headless=new',
			'--remote-debugging-port=0',
			`--user-data-dir=${profile}`,
			'--no-first-run',
			'--no-default-browser-check',
			'about:blank'
		],
		{ stdio: 'ignore', detached: true }
	);

	// Chrome picks a free port and writes it to DevToolsActivePort.
	let port;
	for (let i = 0; i < 100 && !port; i++) {
		await sleep(100);
		try {
			port = readFileSync(join(profile, 'DevToolsActivePort'), 'utf8').split('\n')[0];
		} catch {
			// not written yet
		}
	}
	if (!port) throw new Error('Chrome did not start');

	const targets = await (await fetch(`http://127.0.0.1:${port}/json/list`)).json();
	const socket = new WebSocket(
		targets.find((target) => target.type === 'page').webSocketDebuggerUrl
	);
	await new Promise((resolve, reject) => {
		socket.addEventListener('open', resolve, { once: true });
		socket.addEventListener('error', reject, { once: true });
	});

	let nextId = 0;
	const pending = new Map();
	const listeners = new Map();
	const errors = [];
	socket.addEventListener('message', ({ data }) => {
		const message = JSON.parse(data);
		if (message.id !== undefined) {
			const request = pending.get(message.id);
			pending.delete(message.id);
			if (message.error) request?.reject(new Error(`${request.method}: ${message.error.message}`));
			else request?.resolve(message.result);
			return;
		}
		for (const listener of listeners.get(message.method) ?? []) listener(message.params);
	});

	function send(method, params = {}) {
		const id = ++nextId;
		return new Promise((resolve, reject) => {
			pending.set(id, { resolve, reject, method });
			socket.send(JSON.stringify({ id, method, params }));
		});
	}

	function on(method, listener) {
		listeners.set(method, [...(listeners.get(method) ?? []), listener]);
	}

	on('Runtime.exceptionThrown', ({ exceptionDetails }) =>
		errors.push(exceptionDetails.exception?.description ?? exceptionDetails.text)
	);
	on('Runtime.consoleAPICalled', ({ type, args }) => {
		if (type === 'error') errors.push(args.map((arg) => arg.value ?? arg.description).join(' '));
	});
	// Accept confirm() dialogs (e.g. "Remove this book?").
	on(
		'Page.javascriptDialogOpening',
		() => void send('Page.handleJavaScriptDialog', { accept: true })
	);

	await send('Runtime.enable');
	await send('Page.enable');

	const page = {
		profile,
		/** Uncaught exceptions and console.error calls seen so far. */
		errors,

		async goto(url) {
			const loaded = new Promise((resolve) => on('Page.loadEventFired', resolve));
			await send('Page.navigate', { url });
			await loaded;
		},

		async reload() {
			const loaded = new Promise((resolve) => on('Page.loadEventFired', resolve));
			await send('Page.reload', { ignoreCache: true });
			await loaded;
		},

		/** Evaluates an expression (or async IIFE source) in the page and returns its JSON value. */
		async evaluate(expression) {
			const { result, exceptionDetails } = await send('Runtime.evaluate', {
				expression,
				awaitPromise: true,
				returnByValue: true
			});
			if (exceptionDetails) {
				throw new Error(exceptionDetails.exception?.description ?? exceptionDetails.text);
			}
			return result.value;
		},

		/** Polls `expression` until it returns something truthy, then returns it. */
		async waitFor(expression, { timeout = 15_000, interval = 50 } = {}) {
			const started = Date.now();
			for (;;) {
				const value = await page.evaluate(expression).catch(() => undefined);
				if (value) return value;
				if (Date.now() - started > timeout) {
					const seen = await page
						.evaluate(`({ url: location.pathname, text: document.body.innerText.slice(0, 400) })`)
						.catch(() => undefined);
					throw new Error(
						`Timed out waiting for: ${expression}\nPage was: ${JSON.stringify(seen)}\nErrors: ${JSON.stringify(errors)}`
					);
				}
				await sleep(interval);
			}
		},

		async setViewport({ width, height, mobile = false }) {
			await send('Emulation.setDeviceMetricsOverride', {
				width,
				height,
				deviceScaleFactor: mobile ? 2 : 1,
				mobile
			});
			await send(
				'Emulation.setTouchEmulationEnabled',
				mobile ? { enabled: true, maxTouchPoints: 5 } : { enabled: false }
			);
		},

		async setColorScheme(value) {
			await send('Emulation.setEmulatedMedia', {
				features: [{ name: 'prefers-color-scheme', value }]
			});
		},

		/** Chooses files in the page's file input, like the OS file picker (disk-backed Files). */
		async chooseFiles(paths, selector = 'input[type=file]') {
			const { root } = await send('DOM.getDocument', { depth: 0 });
			const { nodeId } = await send('DOM.querySelector', { nodeId: root.nodeId, selector });
			if (!nodeId) throw new Error(`No element matches ${selector}`);
			await send('DOM.setFileInputFiles', { nodeId, files: paths });
		},

		/** A real touch tap at viewport coordinates. */
		async tap(x, y) {
			const points = [{ x, y }];
			await send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: points });
			await send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
		},

		/** A real touch swipe between two points. */
		async swipe(from, to, steps = 8) {
			await send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [from] });
			for (let i = 1; i <= steps; i++) {
				const point = {
					x: from.x + ((to.x - from.x) * i) / steps,
					y: from.y + ((to.y - from.y) * i) / steps
				};
				await send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [point] });
				await sleep(10);
			}
			await send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
		},

		async keyPress(key) {
			await send('Input.dispatchKeyEvent', { type: 'keyDown', key, code: key });
			await send('Input.dispatchKeyEvent', { type: 'keyUp', key, code: key });
		},

		async screenshot() {
			const { data } = await send('Page.captureScreenshot', { format: 'png' });
			return Buffer.from(data, 'base64');
		},

		rendererMemoryMB: () => rendererMemoryMB(profile),

		async close() {
			socket.close();
			try {
				process.kill(-chrome.pid, 'SIGKILL');
			} catch {
				// already gone
			}
			await sleep(200);
			rmSync(profile, { recursive: true, force: true });
		}
	};

	return page;
}
