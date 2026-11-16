<script lang="ts">
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';
	import { countUpload } from '#lib/analytics.ts';
	import { isArchiveFile } from '#lib/archive-paths.ts';
	import { addBook } from '#lib/extract/addBook.ts';
	import { failures } from '#lib/stores/failures.ts';
	import { onMount } from 'svelte';

	const accept = [
		'.cbz',
		'.zip',
		'application/zip',
		'application/x-zip-compressed',
		'.cbr',
		'.rar',
		'application/vnd.rar',
		'application/x-rar-compressed'
	].join();

	let opening = $state(false);
	let dragging = $state(false);

	async function open(files: File[]) {
		for (const file of files.filter((file) => !isArchiveFile(file.name))) {
			failures.report(file.name, 'only .cbz, .cbr, .zip and .rar files can be opened');
		}

		const archives = files.filter((file) => isArchiveFile(file.name));
		if (archives.length === 0) {
			return;
		}

		opening = true;
		void navigator.storage?.persist?.();

		const added = archives.map((file) => {
			countUpload(file);
			const book = addBook(file);
			book.firstPage.catch((error: unknown) =>
				failures.report(file.name, error instanceof Error ? error.message : String(error))
			);
			return book;
		});

		try {
			const [only] = added;
			if (added.length === 1 && only) {
				// Start reading as soon as the first page exists; the rest extracts in the background.
				await only.firstPage;
				await goto(
					resolve('/book/[bookName]/page/[pageNumber]', {
						bookName: only.bookName,
						pageNumber: '0'
					})
				);
			} else {
				await Promise.any(added.map((book) => book.firstPage));
				await goto(resolve('/books'));
			}
		} catch {
			// Already reported through `failures`.
		} finally {
			opening = false;
		}
	}

	function onDrop(event: DragEvent) {
		event.preventDefault();
		dragging = false;
		void open([...(event.dataTransfer?.files ?? [])]);
	}

	let fileInput: HTMLInputElement | undefined = $state();

	function openChosen(input: HTMLInputElement) {
		const files = [...(input.files ?? [])];
		input.value = '';
		void open(files);
	}

	onMount(() => {
		// The page is prerendered, so on a slow device files can be chosen before this script has
		// started; their change event is lost. Pick them up now instead of ignoring them.
		if (fileInput?.files?.length) {
			openChosen(fileInput);
		}

		// Opening a .cbz/.cbr from the OS when the app is installed (PWA file handler).
		window.launchQueue?.setConsumer(async ({ files }) => {
			void open(await Promise.all(files.map((handle) => handle.getFile())));
		});
	});
</script>

<svelte:head>
	<title>Comic Reader</title>
</svelte:head>

<section
	class="drop-zone"
	class:dragging
	aria-label="Add books"
	ondragover={(event) => {
		event.preventDefault();
		dragging = true;
		if (event.dataTransfer) event.dataTransfer.dropEffect = 'copy';
	}}
	ondragleave={() => (dragging = false)}
	ondrop={onDrop}
>
	{#if opening}
		<p class="status" role="status">Opening…</p>
	{:else}
		<label class="choose">
			Choose comics
			<input
				bind:this={fileInput}
				type="file"
				{accept}
				multiple
				onchange={(event) => openChosen(event.currentTarget)}
			/>
		</label>
		<p class="hint">or drop .cbz, .cbr, .zip or .rar files here</p>
	{/if}
</section>

<style>
	.drop-zone {
		display: grid;
		place-content: center;
		justify-items: center;
		gap: 1rem;
		min-height: calc(100dvh - 8rem);
		margin: 1rem;
		border: 2px dashed var(--border);
		border-radius: 1rem;
		text-align: center;
	}

	.dragging {
		border-color: var(--accent);
		background: var(--surface);
	}

	.choose {
		display: inline-block;
		padding: 0.75rem 1.5rem;
		border-radius: 0.75rem;
		background: var(--accent);
		color: white;
		cursor: pointer;
	}

	.choose input {
		position: absolute;
		width: 1px;
		height: 1px;
		opacity: 0;
	}

	.choose:focus-within {
		outline: 2px solid var(--link);
		outline-offset: 2px;
	}

	.hint,
	.status {
		margin: 0;
		color: var(--text-muted);
	}
</style>
