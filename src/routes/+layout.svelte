<script lang="ts">
	import { resolve } from '$app/paths';
	import { progress as extraction } from '#lib/stores/progress.ts';
	import '../app.css';

	const { children } = $props();

	function preventDefault(event: DragEvent) {
		event.preventDefault();
		event.stopImmediatePropagation();
	}
</script>

<div><a href={resolve('/')}>Upload</a> <a href={resolve('/books')}>Books</a></div>

<main draggable="false" ondragover={preventDefault} ondrop={preventDefault}>
	{@render children()}
</main>
{#if $extraction.outOf}
	<progress value={$extraction.current} max={$extraction.outOf}></progress>
{/if}

<style>
	progress {
		appearance: none;
		height: 5px;
		position: absolute;
		top: 0;
		width: 100vw;
		border: 1px solid var(--bg);
	}

	progress::-moz-progress-bar {
		background-color: var(--accent);
	}

	progress::-webkit-progress-value {
		background-color: var(--accent);
	}
</style>
