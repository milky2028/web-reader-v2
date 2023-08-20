<script lang="ts">
	import { books } from '$lib/stores/books';
	import { pages } from '$lib/stores/pages';
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
		{#each $books as [bookName, book]}
			<li>
				<a href="/book/{bookName}/page/0">
					<img
						src={pages.getStaticPage(book.coverName)}
						loading="lazy"
						alt={bookName}
						width="200"
					/>
				</a>
			</li>
		{/each}
	</ul>
{:else}
	<p>No books uploaded yet</p>
{/if}
