<script lang="ts">
	import { books } from '$lib/stores/books';
	import { pages } from '$lib/stores/pages';
	import { derived } from 'svelte/store';

	const covers = derived([books, pages], ([$books, $pages]) =>
		[...$books].map(([bookName, book]) => ({ bookName, coverImg: $pages.get(book.coverName) }))
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
		{#each $covers as { bookName, coverImg } (bookName)}
			<li>
				<a href="/book/{bookName}/page/0">
					<img src={coverImg} loading="lazy" alt={bookName} width="200" />
				</a>
			</li>
		{/each}
	</ul>
{:else}
	<p>No books uploaded yet</p>
{/if}
