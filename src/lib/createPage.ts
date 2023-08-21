import { fileToImage } from './fileToImage';
import { getFile } from './filesystem/getFile';

export async function createPage(bookName: string, pageName: string) {
	const file = await getFile(`/books/${bookName}/${pageName}`);
	return fileToImage(file);
}
