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

	let leftPage = Promise.resolve('');
	$: leftPage = pages.getPage($books, bookName, pageNumber);

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

	let pageContainer: HTMLDivElement | undefined;
	function onFullscreen() {
		pageContainer?.requestFullscreen();
	}
</script>

<style>
	.page-container {
		display: grid;
		column-gap: 0.5rem;
		grid-template-columns: 1fr min-content 1fr;
		grid-template-areas: 'space1 page1 space2';
	}

	.loader {
		grid-area: page1;
		align-self: center;
	}

	img {
		max-height: calc(100vh - 40px);
		min-height: calc(100vh - 40px);
	}
</style>

<button on:click={onFullscreen}>Fullscreen</button>
<svelte:window on:keyup={onArrow} />
<div bind:this={pageContainer} class="page-container">
	{#await leftPage}
		<div class="loader">Loading...</div>
	{:then page}
		<img style="grid-area: page1;" src={page} alt="" />
	{/await}
</div>
