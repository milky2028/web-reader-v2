/** CSS width the library grid shows covers at, times a typical tablet pixel ratio. */
export const THUMBNAIL_WIDTH = 400;

/**
 * Downscales an image so grids never hold full-resolution decoded pages (a 2000x3000 page is
 * ~24 MB once decoded). Works on the main thread and in workers. Returns undefined when the
 * browser lacks OffscreenCanvas.
 */
export async function makeThumbnail(image: Blob, width = THUMBNAIL_WIDTH) {
	if (typeof OffscreenCanvas === 'undefined') {
		return undefined;
	}

	const bitmap = await createImageBitmap(image, { resizeWidth: width, resizeQuality: 'medium' });
	try {
		const canvas = new OffscreenCanvas(bitmap.width, bitmap.height);
		canvas.getContext('2d')?.drawImage(bitmap, 0, 0);
		return await canvas.convertToBlob({ type: 'image/webp', quality: 0.8 });
	} finally {
		bitmap.close();
	}
}

export const thumbnailPath = (bookPath: string, index: number) =>
	`${bookPath}/thumbs/${index}.webp`;
