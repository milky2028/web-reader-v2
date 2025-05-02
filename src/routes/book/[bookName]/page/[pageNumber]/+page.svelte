<script lang="ts">
	import { goto } from '$app/navigation';
	import { page } from '$app/stores';
	import { isLandscapeMode } from '$lib/isLandscape';
	import { isTwoPageSpread } from '$lib/isTwoPageSpread';
	import { books } from '$lib/stores/books';
	import { pages } from '$lib/stores/pages';
	import { onMount } from 'svelte';
	import { derived } from 'svelte/store';

	let supportsFullscreen = false;
	onMount(() => {
		supportsFullscreen = 'requestFullscreen' in document.body;
	});

	const bookName = derived(page, ($page) => $page.params.bookName);
	const pageNumber = derived(page, ($page) => +$page.params.pageNumber);

	const lastPage = derived(
		[books, bookName],
		([$books, bookName]) => $books.get(bookName)?.pages.length ?? 1 - 1
	);

	const leftPage = derived([books, bookName, pageNumber], ([$books, $bookName, $pageNumber]) =>
		pages.getPage($books, $bookName, $pageNumber)
	);

	const rightPage = derived([books, bookName, pageNumber], ([$books, $bookName, $pageNumber]) =>
		pages.getPage($books, $bookName, $pageNumber + 1)
	);

	let showingTwoPages = false;
	$: (async () => {
		const [oneIs, twoIs] = await Promise.all([
			$leftPage.then(isTwoPageSpread),
			$rightPage.then(isTwoPageSpread)
		]);

		const imgIsTwoPageSpread = oneIs || twoIs;
		showingTwoPages =
			$isLandscapeMode && $pageNumber !== 0 && $pageNumber !== $lastPage && !imgIsTwoPageSpread;
	})();

	async function goLeft() {
		const previousPageUrl = await pages.getPage($books, $bookName, $pageNumber - 1);
		const previousPageIsTwoPageSpread = await isTwoPageSpread(previousPageUrl);
		const numberOfPagesToGoBack = $isLandscapeMode ? (previousPageIsTwoPageSpread ? 1 : 2) : 1;

		const previousPage =
			$pageNumber - numberOfPagesToGoBack <= 0 ? 0 : $pageNumber - numberOfPagesToGoBack;

		books.updateLastPage($bookName, previousPage);
		goto(`/book/${$bookName}/page/${previousPage}`);
	}

	async function goRight() {
		const numberOfPagesToIncrement = showingTwoPages ? 2 : 1;
		const nextPage =
			$pageNumber + numberOfPagesToIncrement >= $lastPage
				? $pageNumber
				: $pageNumber + numberOfPagesToIncrement;

		if (nextPage !== $pageNumber) {
			await Promise.all([
				pages.getPage($books, $bookName, $pageNumber + numberOfPagesToIncrement),
				pages.getPage($books, $bookName, $pageNumber + numberOfPagesToIncrement + 1)
			]);

			books.updateLastPage($bookName, nextPage);
			goto(`/book/${$bookName}/page/${nextPage}`);
		}
	}

	function onArrow({ key }: KeyboardEvent) {
		if (key === 'ArrowLeft') {
			goLeft();
		}

		if (key === 'ArrowRight') {
			goRight();
		}
	}

	let pageContainer: HTMLButtonElement | undefined;
	function onClick(event: MouseEvent) {
		if (pageContainer) {
			const { left, width } = pageContainer.getBoundingClientRect();

			if (event.clientX - left < width / 2) {
				goLeft();
			} else {
				goRight();
			}
		}
	}

	function onFullscreen() {
		pageContainer?.requestFullscreen();
	}
</script>

<style>
	.page-container {
		appearance: none;
		border: none;
		background-color: transparent;
		display: grid;
		column-gap: 0.5rem;
		width: 100%;
		padding: 0;
		grid-template-columns: 1fr min-content 1fr;
		grid-template-areas: 'space1 page1 space2';
	}

	.page-container:fullscreen {
		overflow: auto;
	}

	.showingTwoPages {
		grid-template-columns: 1fr min-content min-content 1fr;
		grid-template-areas: 'space1 page1 page2 space2';
	}

	.loader {
		align-self: center;
	}

	.page-marker {
		grid-area: space2;
		justify-self: start;
		align-self: end;
		padding-bottom: 1rem;
	}

	img {
		max-height: calc(100vh - 42px);
		min-height: calc(100vh - 42px);
	}
</style>

<a href="/book/{$bookName}">Pages</a>
{#if supportsFullscreen}
	<button on:click={onFullscreen}>Fullscreen</button>
{/if}
<svelte:window on:keyup={onArrow} />
<button bind:this={pageContainer} class="page-container" class:showingTwoPages on:click={onClick}>
	{#await $leftPage}
		<div class="loader" style="grid-area: page1;">Loading...</div>
	{:then page}
		<img style="grid-area: page1;" src={page} alt="" />
	{/await}
	{#if showingTwoPages}
		{#await $rightPage}
			<div class="loader" style="grid-area: page2;">Loading...</div>
		{:then page}
			<img style="grid-area: page2;" src={page} alt="" />
		{/await}
	{/if}
	<div class="page-marker">{$pageNumber} / {$lastPage - 1}</div>
</button>
