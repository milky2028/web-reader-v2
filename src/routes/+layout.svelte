<script lang="ts">
	import '../app.css';

	function preventDefault(event: DragEvent) {
		event.preventDefault();
		event.stopImmediatePropagation();
	}
</script>

<style>
	main {
		height: 100%;
		width: 100%;
	}
</style>

<div><a href="/">Upload</a> <a href="/books">Books</a></div>

<main draggable="false" on:dragover={preventDefault} on:drop={preventDefault}>
	<slot />
</main>
