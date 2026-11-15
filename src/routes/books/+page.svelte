<script lang="ts">
	import { resolve } from '$app/paths';
	import Thumbnail from '#lib/components/Thumbnail.svelte';
	import { books } from '#lib/stores/books.ts';
	import { extracting } from '#lib/stores/extraction.ts';
	import { onMount } from 'svelte';

	const collator = new Intl.Collator('en-US', { numeric: true, sensitivity: 'base' });
	const library = $derived([...$books].sort(([a], [b]) => collator.compare(a, b)));

	let loaded = $state(false);
	onMount(() => void books.loaded.then(() => (loaded = true)));

	function remove(bookName: string) {
		if (confirm(`Remove “${bookName}” from this device?`)) {
			void books.remove(bookName);
		}
	}

	function removeAll() {
		if (confirm(`Remove all ${$books.size} books from this device?`)) {
			void books.removeAll();
		}
	}
</script>

<svelte:head>
	<title>Library - Comic Reader</title>
</svelte:head>

{#if !loaded}
	<p class="empty">Loading…</p>
{:else if library.length === 0}
	<p class="empty">No books yet. <a href={resolve('/')}>Add some</a>.</p>
{:else}
	<ul>
		{#each library as [bookName, book] (bookName)}
			<li>
				<a
					href={resolve('/book/[bookName]/page/[pageNumber]', {
						bookName,
						pageNumber: String(book.lastPage)
					})}
				>
					<Thumbnail {bookName} {book} index={0} alt="" />
					<span class="title">{bookName}</span>
					{#if $extracting.has(bookName)}
						<span class="badge">Adding…</span>
					{:else if book.complete === false}
						<span class="badge">Incomplete, add it again</span>
					{:else}
						<span class="meta">Page {book.lastPage + 1} of {book.pages.length}</span>
					{/if}
				</a>
				<button class="remove" onclick={() => remove(bookName)} aria-label="Remove {bookName}">
					✕
				</button>
			</li>
		{/each}
	</ul>
	<div class="actions">
		<button onclick={removeAll}>Remove all books</button>
	</div>
{/if}

<style>
	ul {
		list-style: none;
		margin: 0;
		padding: 1rem;
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(10rem, 1fr));
		gap: 1.25rem 1rem;
	}

	li {
		position: relative;
	}

	a {
		display: grid;
		gap: 0.25rem;
		color: inherit;
		text-decoration: none;
	}

	.title {
		display: -webkit-box;
		-webkit-line-clamp: 2;
		line-clamp: 2;
		-webkit-box-orient: vertical;
		overflow: hidden;
		font-weight: 500;
	}

	.meta,
	.badge {
		font-size: 0.875rem;
		color: var(--text-muted);
	}

	.remove {
		position: absolute;
		top: 0.25rem;
		right: 0.25rem;
	}

	.actions {
		padding: 0 1rem 2rem;
	}

	.empty {
		padding: 2rem 1rem;
		color: var(--text-muted);
	}
</style>
