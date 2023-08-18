<script lang="ts">
	function getFiles(event: DragEvent | (Event & { currentTarget: HTMLInputElement })) {
		const files =
			event instanceof DragEvent ? event.dataTransfer?.files : event.currentTarget.files;
		return Array.from(files ?? []);
	}

	function onUpload(event: DragEvent | (Event & { currentTarget: HTMLInputElement })) {
		const files = getFiles(event);

		for (const file of files) {
			// eslint-disable-next-line no-console
			console.log(file);
		}
	}

	function onDragover(event: DragEvent) {
		event.preventDefault();

		if (event.dataTransfer) {
			event.dataTransfer.dropEffect = 'copy';
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
