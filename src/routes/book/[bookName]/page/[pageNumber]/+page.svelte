<script lang="ts">
	import { goto } from '$app/navigation';
	import { page } from '$app/stores';
	import { books } from '$lib/stores/books';
	import { pages } from '$lib/stores/pages';

	let { bookName } = $page.params;
	let pageNumber = +$page.params.pageNumber;
	$: {
		({ bookName } = $page.params);
		pageNumber = +$page.params.pageNumber;
	}

	let lastPage = $books.get(bookName)?.pages.length ?? 1 - 1;
	$: lastPage = $books.get(bookName)?.pages.length ?? 1 - 1;

	function onArrow({ key }: KeyboardEvent) {
		if (key === 'ArrowRight') {
			const nextPage = pageNumber + 1 >= lastPage ? lastPage : pageNumber + 1;
			goto(`/book/${bookName}/page/${nextPage}`);
		}

		if (key === 'ArrowLeft') {
			const previousPage = pageNumber - 1 <= 0 ? 0 : pageNumber - 1;
			goto(`/book/${bookName}/page/${previousPage}`);
		}
	}
</script>

<svelte:window on:keyup={onArrow} />
{#await pages.getPage($books, bookName, pageNumber)}
	<div>Loading...</div>
{:then page}
	<img src={page} alt="" width="700" />
{/await}
