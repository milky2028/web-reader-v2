<script lang="ts">
	import { goto } from '$app/navigation';
	import { page } from '$app/stores';
	import { books } from '$lib/stores/books';

	let { bookName } = $page.params;
	let pageNumber = +$page.params.pageNumber;
	$: {
		({ bookName } = $page.params);
		pageNumber = +$page.params.pageNumber;
	}

	const lastPage = $books.get(bookName)?.pages.length ?? 1 - 1;

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
{bookName}
{pageNumber}
