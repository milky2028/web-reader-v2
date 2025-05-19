<script>
	import { page } from '$app/stores';
	import { books } from '$lib/stores/books';
	import { pages } from '$lib/stores/pages';
	import { derived } from 'svelte/store';

	const renderablePages = derived([books, page], ([$books, $page]) => {
		const book = $books.get($page.params.bookName);
		if (book) {
			return Promise.all(
				book.pages.map((pageName) => pages.getPage($books, $page.params.bookName, pageName))
			);
		}

		return [];
	});
</script>

<svelte:head>
	<title>{$page.params.bookName} - Comic Reader</title>
</svelte:head>

{#await $renderablePages}
	<div>Loading...</div>
{:then bookPages}
	{#each bookPages as bookPage, i}
		<a href="/book/{$page.params.bookName}/page/{i}">
			<img src={bookPage} alt="" loading="lazy" width="200" />
		</a>
	{/each}
{/await}
