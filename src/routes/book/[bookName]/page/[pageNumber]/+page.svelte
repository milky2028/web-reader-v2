<script lang="ts">
	import { resolve } from '$app/paths';
	import { goto } from '$app/navigation';
	import { page } from '$app/state';
	import { isLandscapeMode } from '#lib/isLandscape.ts';
	import { isTwoPageSpread } from '#lib/isTwoPageSpread.ts';
	import { books } from '#lib/stores/books.ts';
	import { pages } from '#lib/stores/pages.ts';
	import { onMount } from 'svelte';
	import { derived, toStore } from 'svelte/store';

	let supportsFullscreen = $state(false);
	onMount(() => {
		supportsFullscreen = 'requestFullscreen' in document.body;
	});

	const params = toStore(() => page.params);
	const bookName = derived(params, ($params) => $params.bookName ?? '');
	const pageNumber = derived(params, ($params) => Number($params.pageNumber));

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

	let showingTwoPages = $state(false);
	$effect(() => {
		// read every dependency synchronously so the effect tracks all of them
		const left = $leftPage;
		const right = $rightPage;
		const landscape = $isLandscapeMode;
		const current = $pageNumber;
		const last = $lastPage;

		void (async () => {
			const [oneIs, twoIs] = await Promise.all([
				left.then(isTwoPageSpread),
				right.then(isTwoPageSpread)
			]);

			const imgIsTwoPageSpread = oneIs || twoIs;
			showingTwoPages = landscape && current !== 0 && current !== last && !imgIsTwoPageSpread;
		})();
	});

	async function goLeft() {
		const previousPageUrl = await pages.getPage($books, $bookName, $pageNumber - 1);
		const previousPageIsTwoPageSpread = await isTwoPageSpread(previousPageUrl);
		const numberOfPagesToGoBack = $isLandscapeMode ? (previousPageIsTwoPageSpread ? 1 : 2) : 1;

		const previousPage =
			$pageNumber - numberOfPagesToGoBack <= 0 ? 0 : $pageNumber - numberOfPagesToGoBack;

		books.updateLastPage($bookName, previousPage);
		goto(
			resolve('/book/[bookName]/page/[pageNumber]', {
				bookName: $bookName,
				pageNumber: String(previousPage)
			})
		);
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
			goto(
				resolve('/book/[bookName]/page/[pageNumber]', {
					bookName: $bookName,
					pageNumber: String(nextPage)
				})
			);
		}
	}

	function onArrow({ key, code }: KeyboardEvent) {
		if (key === 'ArrowLeft' || key === 'ArrowDown' || key === 'Enter') {
			goLeft();
		}

		if (key === 'ArrowRight' || key === 'ArrowUp' || code === 'Space') {
			goRight();
		}
	}

	let pageContainer: HTMLButtonElement | undefined = $state();
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

	let fullscreenWrapper: HTMLDivElement | undefined = $state();
	function onFullscreen() {
		fullscreenWrapper?.requestFullscreen();
	}
</script>

<svelte:head>
	<title>{$bookName} - Comic Reader</title>
</svelte:head>

<a href={resolve('/book/[bookName]', { bookName: $bookName })}>Pages</a>
{#if supportsFullscreen}
	<button onclick={onFullscreen}>Fullscreen</button>
{/if}
<svelte:window onkeyup={onArrow} />
<div bind:this={fullscreenWrapper} class="fullscreen-wrapper">
	<button bind:this={pageContainer} class="page-container" class:showingTwoPages onclick={onClick}>
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
</div>

<style>
	.fullscreen-wrapper:fullscreen {
		overflow: auto;
	}

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
