<script>
	import { page } from '$app/stores';
	import { books } from '$lib/stores/books';
	import { pages } from '$lib/stores/pages';
	import { derived } from 'svelte/store';

	const book = derived([books, page], ([$books, $page]) => $books.get($page.params.bookName));
</script>

{#each $book?.pages ?? [] as pageName, i (pageName)}
	<a href="/book/{$page.params.bookName}/page/{i}">
		{#await pages.getPage($books, $page.params.bookName, pageName)}
			<div>Loading...</div>
		{:then page}
			<img src={page} alt="" loading="lazy" width="200" />
		{/await}</a
	>
{/each}
