<script lang="ts">
	import { goto } from '$app/navigation';
	import { page } from '$app/stores';
	import { isLandscapeMode } from '$lib/isLandscape';
	import { isTwoPageSpread } from '$lib/isTwoPageSpread';
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

	let rightPage = Promise.resolve('');
	$: rightPage = pages.getPage($books, bookName, pageNumber + 1);

	let showingTwoPages = false;
	$: (async () => {
		const [oneIs, twoIs] = await Promise.all([
			leftPage.then(isTwoPageSpread),
			rightPage.then(isTwoPageSpread)
		]);

		const imgIsTwoPageSpread = oneIs || twoIs;
		showingTwoPages =
			$isLandscapeMode && pageNumber !== 0 && pageNumber !== lastPage && !imgIsTwoPageSpread;
	})();

	let numberOfPagesToIncrement = 1;
	$: numberOfPagesToIncrement = showingTwoPages ? 2 : 1;

	async function onArrow({ key }: KeyboardEvent) {
		if (key === 'ArrowRight') {
			const numberOfPagesToIncrement = showingTwoPages ? 2 : 1;

			const nextPage =
				pageNumber + numberOfPagesToIncrement >= lastPage
					? pageNumber
					: pageNumber + numberOfPagesToIncrement;

			if (nextPage !== pageNumber) {
				await Promise.all([
					pages.getPage($books, bookName, pageNumber + numberOfPagesToIncrement),
					pages.getPage($books, bookName, pageNumber + numberOfPagesToIncrement + 1)
				]);

				goto(`/book/${bookName}/page/${nextPage}`);
			}
		}

		if (key === 'ArrowLeft') {
			const previousPageUrl = await pages.getPage($books, bookName, pageNumber - 1);
			const previousPageIsTwoPageSpread = await isTwoPageSpread(previousPageUrl);
			const numberOfPagesToGoBack = previousPageIsTwoPageSpread ? 1 : 2;

			const previousPage =
				pageNumber - numberOfPagesToGoBack <= 0 ? 0 : pageNumber - numberOfPagesToGoBack;
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

	.showingTwoPages {
		grid-template-columns: 1fr min-content min-content 1fr;
		grid-template-areas: 'space1 page1 page2 space2';
	}

	.loader {
		align-self: center;
	}

	img {
		max-height: calc(100vh - 40px);
		min-height: calc(100vh - 40px);
	}
</style>

<a href="/book/{bookName}">Pages</a>
<button on:click={onFullscreen}>Fullscreen</button>
<svelte:window on:keyup={onArrow} />
<div bind:this={pageContainer} class="page-container" class:showingTwoPages>
	{#await leftPage}
		<div class="loader" style="grid-area: page1;">Loading...</div>
	{:then page}
		<img style="grid-area: page1;" src={page} alt="" />
	{/await}
	{#if showingTwoPages}
		{#await rightPage}
			<div class="loader" style="grid-area: page2;">Loading...</div>
		{:then page}
			<img style="grid-area: page2;" src={page} alt="" />
		{/await}
	{/if}
</div>
