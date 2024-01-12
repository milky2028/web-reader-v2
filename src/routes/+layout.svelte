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
		height: 5px;
		position: absolute;
		top: 0;
		width: 100vw;
		border: 1px solid white;
	}

	progress::-moz-progress-bar {
		background-color: #007ba7;
	}

	progress::-webkit-progress-value {
		background-color: #007ba7;
	}
</style>

<div><a href="/">Upload</a> <a href="/books">Books</a></div>

<main draggable="false" on:dragover={preventDefault} on:drop={preventDefault}>
	<slot />
</main>
{#if $progress.outOf}
	<progress value={$progress.current} max={$progress.outOf} />
{/if}
