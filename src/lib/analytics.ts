/**
 * Minimal, privacy-friendly usage counting with GoatCounter (https://www.goatcounter.com):
 * free for personal sites, open source, and cookie-less, so no consent banner is needed.
 *
 * Instead of loading GoatCounter's script we hit its documented `/count` endpoint directly,
 * which keeps third-party JS off the critical path.
 *
 * Privacy: only route *patterns* are sent (e.g. `/book/[bookName]/page/[pageNumber]`), never
 * book titles or file names, because those come from the user's own files.
 */

/**
 * e.g. 'https://comic-reader.goatcounter.com/count', set via VITE_GOATCOUNTER_ENDPOINT in
 * netlify.toml. Empty disables counting.
 */
const endpoint = () => import.meta.env.VITE_GOATCOUNTER_ENDPOINT ?? '';

type CountOptions = {
	/** Title shown in the GoatCounter dashboard. Must never contain user data. */
	title?: string;
	/** Count as an event (e.g. an upload) instead of a page view. */
	event?: boolean;
};

function isCountable() {
	return (
		endpoint() !== '' &&
		!__IS_DEV__ &&
		typeof navigator !== 'undefined' &&
		!navigator.webdriver &&
		location.hostname !== 'localhost' &&
		location.hostname !== '127.0.0.1'
	);
}

let referrerSent = false;

export function count(path: string, { title = 'Comic Reader', event = false }: CountOptions = {}) {
	if (!isCountable()) {
		return;
	}

	const params = new URLSearchParams({
		p: path,
		t: title,
		s: `${screen.width},${screen.height},${devicePixelRatio}`,
		rnd: Math.random().toString(36).slice(2)
	});

	if (event) {
		params.set('e', 'true');
	}

	// Only the landing page view carries an (external) referrer.
	if (!referrerSent) {
		referrerSent = true;
		if (document.referrer && new URL(document.referrer).host !== location.host) {
			params.set('r', document.referrer);
		}
	}

	fetch(`${endpoint()}?${params}`, { mode: 'no-cors', keepalive: true }).catch(() => {
		// Ad blockers commonly block analytics; that is fine.
	});
}

function sizeBucket(bytes: number) {
	const gb = bytes / 1024 ** 3;
	if (gb >= 4) return '4GB+';
	if (gb >= 2) return '2-4GB';
	if (gb >= 1) return '1-2GB';
	if (bytes >= 100 * 1024 ** 2) return '100MB-1GB';
	return '<100MB';
}

/** Records that a book was added, by archive type and rough size only. */
export function countUpload(file: File) {
	const extension = file.name.split('.').pop()?.toLowerCase() ?? 'unknown';
	count(`upload/${extension}/${sizeBucket(file.size)}`, { title: 'Book added', event: true });
}

/** Records that adding a book failed, so silent failures show up in the dashboard. */
export function countUploadFailure(file: File, reason: string) {
	const extension = file.name.split('.').pop()?.toLowerCase() ?? 'unknown';
	count(`upload-failed/${extension}/${sizeBucket(file.size)}/${reason}`, {
		title: 'Book failed to add',
		event: true
	});
}
