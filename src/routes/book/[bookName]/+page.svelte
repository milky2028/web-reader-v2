<script lang="ts">
	import { resolve } from '$app/paths';
	import { page } from '$app/state';
	import Thumbnail from '#lib/components/Thumbnail.svelte';
	import { books } from '#lib/stores/books.ts';

	const bookName = $derived(page.params.bookName ?? '');
	const book = $derived($books.get(bookName));
</script>

<svelte:head>
	<title>{bookName} - Comic Reader</title>
</svelte:head>

{#if book}
	<h1>{bookName}</h1>
	<ol>
		{#each book.pages as _, index (index)}
			<li>
				<a
					href={resolve('/book/[bookName]/page/[pageNumber]', {
						bookName,
						pageNumber: String(index)
					})}
					aria-label="Page {index + 1}"
					aria-current={index === book.lastPage ? 'page' : undefined}
				>
					<Thumbnail {bookName} {book} {index} />
					<span>{index + 1}</span>
				</a>
			</li>
		{/each}
	</ol>
{:else}
	<p>Loading…</p>
{/if}

<style>
	h1 {
		font-size: 1.25rem;
		margin: 1rem;
	}

	ol {
		list-style: none;
		margin: 0;
		padding: 0 1rem 2rem;
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(9.5rem, 1fr));
		gap: 1rem;
	}

	a {
		display: grid;
		gap: 0.375rem;
		justify-items: center;
		padding: 0.25rem;
		border-radius: 0.5rem;
		color: var(--text-muted);
		font-size: 1.125rem;
		text-decoration: none;
	}

	a[aria-current='page'] {
		color: var(--accent);
		font-weight: 600;
		outline: 3px solid var(--accent);
	}
</style>
