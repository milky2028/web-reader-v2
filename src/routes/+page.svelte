<script lang="ts">
	import { goto } from '$app/navigation';
	import { fileToImage } from '$lib/fileToImage';
	import { writeFile } from '$lib/filesystem/writeFile';
	import { isImage } from '$lib/isImage';
	import { isMacOSFile } from '$lib/isMacOSFile';
	import { sortPagesCoverFirst } from '$lib/sortPages';
	import { books } from '$lib/stores/books';
	import { pages } from '$lib/stores/pages';

	function onDragover(event: DragEvent) {
		event.preventDefault();

		if (event.dataTransfer) {
			event.dataTransfer.dropEffect = 'copy';
		}
	}

	function getFiles(event: DragEvent | (Event & { currentTarget: HTMLInputElement })) {
		const files =
			event instanceof DragEvent ? event.dataTransfer?.files : event.currentTarget.files;
		return Array.from(files ?? []);
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
				coverName: cover?.name ?? ''
			});

			if (cover instanceof CompressedFile) {
				const [coverName] = pageNames;
				if (coverName) {
					const coverPage = await cover.extract();
					pages.add(coverName, await fileToImage(coverPage));
					writeFile(`/books/${bookName}/${cover?.name}`, coverPage);
				}
			}

			archive.extractFiles(({ file }) => {
				if (file.name !== cover?.name) {
					writeFile(`/books/${bookName}/${file.name}`, file);
				}
			});

			return bookName;
		});

		const [bookName] = await Promise.all(extractFiles);
		if (files.length === 1) {
			goto(`/book/${bookName}/page/0`);
		} else {
			goto('/books');
		}
	}
</script>

<style>
	.container {
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
		<input on:change={onUpload} type="file" accept=".cbz, .zip, .cbr, .rar" multiple />
	</div>
</div>
