<script lang="ts">
	import { books } from '$lib/stores/books';
	import { pages } from '$lib/stores/pages';
	import { derived } from 'svelte/store';

	const covers = derived([books, pages], ([$books, _$pages]) =>
		Promise.all(
			[...$books]
				.sort(([bookNameA], [bookNameB]) => bookNameA.localeCompare(bookNameB))
				.map(async ([bookName, { coverName, lastPage }]) => ({
					bookName,
					coverImg: await pages.getPage($books, bookName, coverName),
					lastPage
				}))
		)
	);
</script>

<style>
	ul {
		list-style: none;
		margin: 0;
		padding: 0;
	}

	li {
		display: inline-block;
	}

	a {
		padding: 0.25rem;
	}
</style>

{#await $covers}
	<div>Loading...</div>
{:then cover}
	{#if $books.size === 0}
		<p>No books uploaded yet</p>
	{:else}
		<ul>
			{#each cover as { bookName, coverImg, lastPage } (bookName)}
				<li>
					<a href="/book/{bookName}/page/{lastPage}">
						<img src={coverImg} loading="lazy" alt={bookName} width="200" />
					</a>
				</li>
			{/each}
		</ul>
	{/if}
{/await}
