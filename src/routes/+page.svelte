<script lang="ts">
	import { goto } from '$app/navigation';
	import { extractAllEntries } from '$lib/extractAllEntries';
	import { extractSingleEntry } from '$lib/extractSingleEntry';
	import { fileToImage } from '$lib/fileToImage';
	import { listEntryPaths } from '$lib/listEntryPaths';
	import { books } from '$lib/stores/books';
	import { pages } from '$lib/stores/pages';

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
		await navigator.storage.persist();

		const fileExtractions = files.map(async (file) => {
			const bookName = file.name.slice(0, file.name.length - 4);
			const pageNames = await listEntryPaths(file);
			const [coverName] = pageNames;

			const coverFile = await extractSingleEntry({ file, bookName, entryName: coverName });
			books.add(bookName, {
				pages: pageNames,
				coverName,
				lastPage: 0
			});
			pages.add(coverName, await fileToImage(coverFile));

			extractAllEntries({ file, bookName });
			return bookName;
		});

		await Promise.all(fileExtractions);

		const [bookName] = await Promise.all(fileExtractions);
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
