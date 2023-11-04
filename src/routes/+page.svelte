<script lang="ts">
	import { goto } from '$app/navigation';
	import { fileToImage } from '$lib/fileToImage';
	import { writeFile } from '$lib/filesystem/writeFile';
	import { isImage } from '$lib/isImage';
	import { isMacOSFile } from '$lib/isMacOSFile';
	import { sortPagesCoverFirst } from '$lib/sortPages';
	import { books } from '$lib/stores/books';
	import { pages } from '$lib/stores/pages';
	import { unrarFallback } from '$lib/unrarFallback';

	const acceptedFileTypes = [
		// zip
		'.cbz',
		'.zip',
		'application/zip',
		'application/x-zip-compressed',
		'multipart/x-zip',
		// rar
		'.cbr',
		'application/vnd.rar',
		'application/x-rar-compressed',
		// both
		'application/octet-stream'
	];

	function onDragover(event: DragEvent) {
		event.preventDefault();

		if (event.dataTransfer) {
			event.dataTransfer.dropEffect = 'copy';
		}
	}

	function getFiles(event: DragEvent | (Event & { currentTarget: HTMLInputElement })) {
		const files =
			event instanceof DragEvent ? event.dataTransfer?.files : event.currentTarget.files;
		return Array.from(files ?? []).filter((file) => file.name.match(/.cbr|.cbz|.rar|.zip$/));
	}

	async function onUpload(event: DragEvent | (Event & { currentTarget: HTMLInputElement })) {
		const files = getFiles(event);

		const [{ Archive, CompressedFile }] = await Promise.all([
			import('$lib/archive'),
			navigator.storage.persist()
		]);

		const extractFiles = files.map(async (file) => {
			const archive = await Archive.open(file);
			const archivedFiles = await archive.getFilesArray();

			const sortedPages = archivedFiles
				.filter((page) => !isMacOSFile(page) && isImage(page))
				.sort(sortPagesCoverFirst);

			const cover = sortedPages[0]?.file;
			const pageNames = sortedPages.map((page) => page.file.name);

			const bookName = file.name.slice(0, file.name.length - 4);
			books.add(bookName, {
				path: sortedPages[0]?.path ?? '',
				pages: pageNames,
				coverName: cover?.name ?? '',
				lastPage: 0
			});

			if (cover instanceof CompressedFile) {
				const [coverName] = pageNames;
				if (coverName) {
					const coverPage = await cover.extract();
					pages.add(coverName, await fileToImage(coverPage));
					writeFile(`/books/${bookName}/${cover?.name}`, coverPage);
				}
			}

			archive
				.extractFiles(({ file }) => {
					if (file.name !== cover?.name) {
						writeFile(`/books/${bookName}/${file.name}`, file);
					}
				})
				.catch(async () => {
					const response = await unrarFallback(file);
					const fileWrites = Object.values(response.ls).map(
						// eslint-disable-next-line no-undef
						async (entry: UnrarDirectory | UnrarFile) => {
							if (entry.type === 'file') {
								const fallbackFile = new File([entry.fileContent], entry.fullFileName);
								await writeFile(`/books/${bookName}/${entry.fullFileName}`, fallbackFile);
							}
						}
					);

					await Promise.all(fileWrites);
				});

			return bookName;
		});

		const [bookName] = await Promise.all(extractFiles);
		if (files.length === 1) {
			goto(`/book/${bookName}/page/0`);
		} else if (files.length > 0) {
			goto('/books');
		}
	}
</script>

<style>
	.container {
		position: absolute;
		display: grid;
		place-items: center;
		width: 100%;
		height: 100%;
	}

	.drop-zone {
		border-radius: 1rem;
		display: grid;
		place-items: center;
		border: 1px solid black;
		width: 50%;
		height: 50%;
	}
</style>

<div class="container">
	<div role="button" tabindex="0" on:dragover={onDragover} on:drop={onUpload} class="drop-zone">
		<input on:change={onUpload} type="file" accept={acceptedFileTypes.join()} multiple />
	</div>
</div>
