import { browser } from '$app/environment';

export async function isTwoPageSpread(url: string) {
	if (browser && url) {
		const img = new Image();
		img.src = url;
		await img.decode();

		return img.naturalWidth > img.naturalHeight;
	}

	return false;
}
