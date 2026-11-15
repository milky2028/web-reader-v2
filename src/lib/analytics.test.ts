import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const ENDPOINT = 'https://example.goatcounter.com/count';

describe('analytics', () => {
	const fetchMock = vi.fn((_url: string, _init?: RequestInit) => Promise.resolve(new Response()));

	beforeEach(() => {
		vi.resetModules();
		vi.stubEnv('VITE_GOATCOUNTER_ENDPOINT', ENDPOINT);
		vi.stubGlobal('__IS_DEV__', false);
		vi.stubGlobal('fetch', fetchMock);
		vi.stubGlobal('navigator', { webdriver: false });
		vi.stubGlobal('location', { hostname: 'comic-reader.com', host: 'comic-reader.com' });
		vi.stubGlobal('screen', { width: 800, height: 1280 });
		vi.stubGlobal('devicePixelRatio', 2);
		vi.stubGlobal('document', { referrer: 'https://news.example/post' });
		fetchMock.mockClear();
	});

	afterEach(() => {
		vi.unstubAllGlobals();
		vi.unstubAllEnvs();
	});

	it('counts a page view by route pattern, with the external referrer once', async () => {
		const { count } = await import('./analytics.ts');
		count('/book/[bookName]/page/[pageNumber]');
		count('/books');

		const [first, second] = fetchMock.mock.calls.map(([url]) => new URL(url));
		expect(first!.origin + first!.pathname).toBe(ENDPOINT);
		expect(first!.searchParams.get('p')).toBe('/book/[bookName]/page/[pageNumber]');
		expect(first!.searchParams.get('r')).toBe('https://news.example/post');
		expect(second!.searchParams.get('r')).toBeNull();
	});

	it('never sends the file name of an upload', async () => {
		const { countUpload } = await import('./analytics.ts');
		countUpload(new File(['x'], 'My Secret Comic.cbz'));

		const url = new URL(fetchMock.mock.calls[0]![0]);
		expect(url.href).not.toContain('Secret');
		expect(url.searchParams.get('p')).toBe('upload/cbz/<100MB');
		expect(url.searchParams.get('e')).toBe('true');
	});

	it('does nothing without an endpoint, on localhost, or under automation', async () => {
		vi.stubEnv('VITE_GOATCOUNTER_ENDPOINT', '');
		(await import('./analytics.ts')).count('/');

		vi.resetModules();
		vi.stubEnv('VITE_GOATCOUNTER_ENDPOINT', ENDPOINT);
		vi.stubGlobal('location', { hostname: 'localhost', host: 'localhost:5173' });
		(await import('./analytics.ts')).count('/');

		vi.resetModules();
		vi.stubGlobal('location', { hostname: 'comic-reader.com', host: 'comic-reader.com' });
		vi.stubGlobal('navigator', { webdriver: true });
		(await import('./analytics.ts')).count('/');

		expect(fetchMock).not.toHaveBeenCalled();
	});
});
