<script lang="ts">
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';
	import { page } from '$app/state';
	import { isLandscapeMode } from '#lib/isLandscape.ts';
	import { getPageUrl, isSpread } from '#lib/pages.ts';
	import { books } from '#lib/stores/books.ts';
	import { onMount } from 'svelte';

	const bookName = $derived(page.params.bookName ?? '');
	const pageNumber = $derived(Math.max(0, Math.trunc(Number(page.params.pageNumber)) || 0));
	const book = $derived($books.get(bookName));
	const pageCount = $derived(book?.pages.length ?? 0);
	const lastIndex = $derived(Math.max(0, pageCount - 1));
	const currentKey = $derived(`${bookName}/${pageNumber}`);

	type View = { key: string; left: string | undefined; right: string | undefined; two: boolean };
	let view: View | undefined = $state();
	const loading = $derived(view?.key !== currentKey);

	let loaded = $state(false);
	let supportsFullscreen = $state(false);
	onMount(() => {
		supportsFullscreen = document.fullscreenEnabled;
		void books.loaded.then(() => (loaded = true));
	});

	// Work out what to show. Every input is read before the first await so the effect tracks all
	// of them, and a stale result (from a page the reader already left) is never applied.
	$effect(() => {
		const currentBook = book;
		const name = bookName;
		const index = pageNumber;
		const key = currentKey;
		const canPair = $isLandscapeMode && index !== 0 && index < lastIndex;
		if (!currentBook) return;

		let cancelled = false;
		void (async () => {
			const [left, leftIsSpread, rightIsSpread] = await Promise.all([
				getPageUrl(name, currentBook, index),
				canPair && isSpread(name, currentBook, index),
				canPair && isSpread(name, currentBook, index + 1)
			]);
			const two = canPair && !leftIsSpread && !rightIsSpread;
			const right = two ? await getPageUrl(name, currentBook, index + 1) : undefined;
			if (cancelled) return;

			view = { key, left, right, two };

			// Warm up the next pages so turning forward is instant.
			const next = index + (two ? 2 : 1);
			void getPageUrl(name, currentBook, next);
			void getPageUrl(name, currentBook, next + 1);
		})();

		return () => {
			cancelled = true;
		};
	});

	function show(index: number) {
		const target = Math.min(Math.max(index, 0), lastIndex);
		if (target === pageNumber) return;
		books.updateLastPage(bookName, target);
		// Replace, so the back button returns to the library instead of stepping through pages.
		void goto(
			resolve('/book/[bookName]/page/[pageNumber]', { bookName, pageNumber: String(target) }),
			{ replace: true }
		);
	}

	function next() {
		const showingTwo = view?.key === currentKey && view.two;
		if (showingTwo && pageNumber + 1 >= lastIndex) return;
		show(pageNumber + (showingTwo ? 2 : 1));
	}

	async function previous() {
		if (pageNumber === 0 || !book) return;
		let step = 1;
		// In landscape, step back over a pair unless that would split a spread or skip page 1.
		if ($isLandscapeMode && pageNumber - 2 >= 1) {
			const [a, b] = await Promise.all([
				isSpread(bookName, book, pageNumber - 1),
				isSpread(bookName, book, pageNumber - 2)
			]);
			if (!a && !b) step = 2;
		}
		show(pageNumber - step);
	}

	function onKeydown(event: KeyboardEvent) {
		if (event.altKey || event.ctrlKey || event.metaKey) return;
		const forward = ['ArrowRight', 'ArrowUp', 'PageDown', ' ', 'Enter'];
		const backward = ['ArrowLeft', 'ArrowDown', 'PageUp', 'Backspace'];
		if (forward.includes(event.key)) {
			event.preventDefault();
			next();
		} else if (backward.includes(event.key)) {
			event.preventDefault();
			void previous();
		}
	}

	let reader: HTMLElement | undefined = $state();
	function onTap(event: MouseEvent) {
		const { left, width } =
			event.currentTarget instanceof HTMLElement
				? event.currentTarget.getBoundingClientRect()
				: { left: 0, width: window.innerWidth };
		if (event.clientX - left < width / 2) {
			void previous();
		} else {
			next();
		}
	}

	function toggleFullscreen() {
		if (document.fullscreenElement) {
			void document.exitFullscreen();
		} else {
			void reader?.requestFullscreen();
		}
	}

	const position = $derived(
		view?.two && !loading
			? `${pageNumber + 1}–${pageNumber + 2} of ${pageCount}`
			: `${pageNumber + 1} of ${pageCount}`
	);
</script>

<svelte:head>
	<title>{bookName} - Comic Reader</title>
</svelte:head>

<svelte:window onkeydown={onKeydown} />

{#if book}
	<div class="reader" bind:this={reader}>
		<header>
			<a href={resolve('/books')}>Library</a>
			<a href={resolve('/book/[bookName]', { bookName })}>Pages</a>
			<span class="position" aria-live="polite">{position}</span>
			{#if supportsFullscreen}
				<button onclick={toggleFullscreen}>Fullscreen</button>
			{/if}
		</header>

		<button
			class="pages"
			class:two={view?.two}
			class:loading
			onclick={onTap}
			aria-label="Tap the left half for the previous page, the right half for the next"
		>
			{#if view}
				{#if view.left}
					<img src={view.left} alt="Page {pageNumber + 1}" draggable="false" />
				{:else}
					<span class="missing">This page couldn't be read.</span>
				{/if}
				{#if view.two && view.right}
					<img src={view.right} alt="Page {pageNumber + 2}" draggable="false" />
				{/if}
			{/if}
			{#if loading}
				<span class="loader" role="status">Loading page…</span>
			{/if}
		</button>
	</div>
{:else if loaded}
	<p class="not-found">
		This book isn't in your library on this device. <a href={resolve('/books')}>Go to library</a>
	</p>
{/if}

<style>
	.reader {
		display: grid;
		grid-template-rows: auto 1fr;
		height: 100dvh;
		background: var(--bg);
	}

	header {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		padding: 0.25rem 0.5rem;
		border-bottom: 1px solid var(--border);
	}

	.position {
		margin-left: auto;
		color: var(--text-muted);
		font-variant-numeric: tabular-nums;
	}

	.pages {
		appearance: none;
		border: none;
		padding: 0;
		margin: 0;
		background: transparent;
		color: inherit;
		font: inherit;
		min-height: 0;
		display: flex;
		justify-content: center;
		align-items: center;
		gap: 0.25rem;
		position: relative;
		cursor: pointer;
		overflow: hidden;
		-webkit-tap-highlight-color: transparent;
		touch-action: manipulation;
	}

	img {
		max-height: 100%;
		max-width: 100%;
		object-fit: contain;
		user-select: none;
	}

	.two img {
		max-width: 50%;
	}

	.loading img {
		opacity: 0.5;
	}

	.loader,
	.missing {
		position: absolute;
		inset: auto 0 1rem;
		color: var(--text-muted);
	}

	.missing {
		position: static;
	}

	.not-found {
		padding: 2rem 1rem;
	}
</style>
