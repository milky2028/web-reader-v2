<script lang="ts">
	import { progress } from '$lib/stores/progress';
	import '../app.css';

	function preventDefault(event: DragEvent) {
		event.preventDefault();
		event.stopImmediatePropagation();
	}
</script>

<style>
	progress {
		appearance: none;
		height: 0.25rem;
		position: absolute;
		top: 0;
		width: 100vw;
		border: 0;
	}
</style>

<div><a href="/">Upload</a> <a href="/books">Books</a></div>

<main draggable="false" on:dragover={preventDefault} on:drop={preventDefault}>
	<slot />
</main>
{#if $progress.outOf}
	<progress value={$progress.current} max={$progress.outOf} />
{/if}
