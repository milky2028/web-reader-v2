<script lang="ts">
	import { afterNavigate } from '$app/navigation';
	import { resolve } from '$app/paths';
	import { page } from '$app/state';
	import { count } from '#lib/analytics.ts';
	import { progress as extractionProgress } from '#lib/stores/extraction.ts';
	import { failures } from '#lib/stores/failures.ts';
	import '../app.css';

	const { children } = $props();

	// Count route patterns only (never the book name in the URL).
	afterNavigate(({ to }) => count(to?.route.id ?? 'unknown'));

	const reading = $derived(page.route.id === '/book/[bookName]/page/[pageNumber]');

	function preventDefault(event: DragEvent) {
		event.preventDefault();
	}
</script>

{#if !reading}
	<nav>
		<a href={resolve('/')} aria-current={page.route.id === '/' ? 'page' : undefined}>Add books</a>
		<a href={resolve('/books')} aria-current={page.route.id === '/books' ? 'page' : undefined}>
			Library
		</a>
	</nav>
{/if}

{#if $failures.length > 0}
	<div class="failures" role="alert">
		{#each $failures as failure (failure.id)}
			<p>
				<span><strong>{failure.name}</strong> couldn't be added: {failure.message}</span>
				<button onclick={() => failures.dismiss(failure.id)} aria-label="Dismiss">✕</button>
			</p>
		{/each}
	</div>
{/if}

<main ondragover={preventDefault} ondrop={preventDefault}>
	{@render children()}
</main>

{#if $extractionProgress.outOf}
	<progress
		value={$extractionProgress.current}
		max={$extractionProgress.outOf}
		aria-label="Adding books"
	></progress>
{/if}

<style>
	nav {
		display: flex;
		gap: 0.25rem;
		padding: 0.25rem;
		border-bottom: 1px solid var(--border);
	}

	nav a {
		display: inline-flex;
		align-items: center;
		min-height: var(--touch);
		padding: 0 1rem;
		border-radius: 0.75rem;
		font-size: 1.125rem;
		text-decoration: none;
	}

	nav a[aria-current='page'] {
		font-weight: 600;
		color: var(--text);
		background: var(--surface);
	}

	.failures {
		background: var(--surface);
		border-bottom: 1px solid var(--border);
	}

	.failures p {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 1rem;
		margin: 0;
		padding: 0.25rem 0.5rem 0.25rem 1rem;
	}

	progress {
		appearance: none;
		position: fixed;
		top: 0;
		left: 0;
		width: 100vw;
		height: 4px;
		border: none;
		background: transparent;
	}

	progress::-moz-progress-bar {
		background-color: var(--accent);
	}

	progress::-webkit-progress-bar {
		background: transparent;
	}

	progress::-webkit-progress-value {
		background-color: var(--accent);
	}
</style>
