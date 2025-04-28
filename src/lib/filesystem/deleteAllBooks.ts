export async function deleteAllBooks() {
	const root = await navigator.storage.getDirectory();
	root.removeEntry('books', { recursive: true });
}
