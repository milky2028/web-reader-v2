export async function fileToImage(file: File) {
	const url = URL.createObjectURL(file);
	const img = new Image();

	img.src = url;
	await img.decode();

	return url;
}
