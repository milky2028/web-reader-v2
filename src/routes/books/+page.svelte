<script lang="ts">
	import { books } from '$lib/stores/books';
	import { pages } from '$lib/stores/pages';
	import { derived } from 'svelte/store';

	const covers = derived([books, pages], ([$books, _$pages]) =>
		[...$books].map(async ([bookName, book]) => ({
			bookName,
			coverImg: await pages.getPage($books, bookName, book.coverName)
		}))
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

{#if $books.size > 0}
	<ul>
		{#each $covers as cover}
			{#await cover}
				<li>Loading...</li>
			{:then { bookName, coverImg }}
				<li>
					<a href="/book/{bookName}/page/0">
						<img src={coverImg} loading="lazy" alt={bookName} width="200" />
					</a>
				</li>
			{/await}
		{/each}
	</ul>
{:else}
	<p>No books uploaded yet</p>
{/if}
