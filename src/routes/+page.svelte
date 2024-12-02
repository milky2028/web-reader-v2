<script lang="ts">
	import { goto } from '$app/navigation';
	import { extractBook, extractBookNative } from '$lib/extractBook';
	import { onMount } from 'svelte';

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

	async function onUpload(files: File[]) {
		await navigator.storage.persist();

		const extractions = files.map(async (file) => {
			const bookName = file.name.slice(0, file.name.length - 4).replace('#', '');
			// await extractBook({ bookName, file });
			await extractBookNative({ bookName, file });

			return bookName;
		});

		const [bookName] = await Promise.all(extractions);
		// if (files.length === 1) {
		// 	goto(`/book/${bookName}/page/0`);
		// } else if (files.length > 0) {
		// 	goto('/books');
		// }
	}

	onMount(() => {
		if ('launchQueue' in window) {
			window.launchQueue.setConsumer(async ({ files }) => {
				const fileData = await Promise.all(files.map((fileHandle) => fileHandle.getFile()));
				onUpload(fileData);
			});
		}
	});
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
	<div
		role="button"
		tabindex="0"
		on:dragover={onDragover}
		on:drop={(event) => onUpload(getFiles(event))}
		class="drop-zone"
	>
		<input
			on:change={(event) => onUpload(getFiles(event))}
			type="file"
			accept={acceptedFileTypes.join()}
			multiple
		/>
	</div>
</div>
