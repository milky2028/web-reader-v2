<script lang="ts">
	import { resolve } from '$app/paths';
	import { page } from '$app/state';
	import { books } from '#lib/stores/books.ts';
	import { pages } from '#lib/stores/pages.ts';

	const bookName = $derived(page.params.bookName ?? '');

	const renderablePages = $derived.by(() => {
		const book = $books.get(bookName);
		if (book) {
			return Promise.all(book.pages.map((pageName) => pages.getPage($books, bookName, pageName)));
		}

		return Promise.resolve([]);
	});
</script>

<svelte:head>
	<title>{bookName} - Comic Reader</title>
</svelte:head>

{#await renderablePages}
	<div>Loading...</div>
{:then bookPages}
	{#each bookPages as bookPage, i (i)}
		<a
			href={resolve('/book/[bookName]/page/[pageNumber]', {
				bookName: bookName,
				pageNumber: String(i)
			})}
		>
			<img src={bookPage} alt="" loading="lazy" width="200" />
		</a>
	{/each}
{/await}
