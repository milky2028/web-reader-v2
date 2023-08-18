<script lang="ts">
	function onUpload(event: Event & { currentTarget: HTMLInputElement }) {
		const files = event.currentTarget?.files ?? [];
		for (const file of files) {
			console.log(file);
		}
	}
</script>

<input on:change={onUpload} type="file" accept=".cbz, .zip, .cbr, .rar" multiple />
