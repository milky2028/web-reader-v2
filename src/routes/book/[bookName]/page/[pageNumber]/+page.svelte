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

	// Toolbar floats over the page so the comic gets the whole screen. It shows briefly on open,
	// toggles with a tap in the middle third, and hides when a page is turned.
	let toolbar = $state(true);
	let hideTimer: ReturnType<typeof setTimeout> | undefined;
	function showToolbar(visible: boolean, autoHide = false) {
		clearTimeout(hideTimer);
		toolbar = visible;
		if (visible && autoHide) hideTimer = setTimeout(() => (toolbar = false), 3000);
	}

	// While pinch-zoomed, let the browser pan freely; otherwise reserve horizontal drags for swipes.
	let zoomed = $state(false);

	onMount(() => {
		showToolbar(true, true);
		const viewport = window.visualViewport;
		const onZoom = () => (zoomed = (viewport?.scale ?? 1) > 1.01);
		viewport?.addEventListener('resize', onZoom);
		return () => {
			clearTimeout(hideTimer);
			viewport?.removeEventListener('resize', onZoom);
		};
	});

	function turn(direction: 'next' | 'previous') {
		showToolbar(false);
		if (direction === 'next') next();
		else void previous();
	}

	// Tap zones: left third = previous, right third = next, middle third = toolbar.
	function onTap(event: MouseEvent) {
		if (swiped) {
			swiped = false;
			return;
		}

		const { left, width } = (event.currentTarget as HTMLElement).getBoundingClientRect();
		const x = (event.clientX - left) / width;
		if (x < 1 / 3) turn('previous');
		else if (x > 2 / 3) turn('next');
		else showToolbar(!toolbar);
	}

	// Horizontal swipes turn pages too (ignored while pinch-zoomed, where a drag should pan).
	let swipeStart: { x: number; y: number; time: number } | undefined;
	let swiped = false;
	function onPointerDown(event: PointerEvent) {
		swipeStart = { x: event.clientX, y: event.clientY, time: event.timeStamp };
	}

	function onPointerUp(event: PointerEvent) {
		const start = swipeStart;
		swipeStart = undefined;
		if (!start || zoomed) return;
		const dx = event.clientX - start.x;
		const dy = event.clientY - start.y;
		if (
			Math.abs(dx) > 60 &&
			Math.abs(dx) > Math.abs(dy) * 1.5 &&
			event.timeStamp - start.time < 800
		) {
			swiped = true; // swallow the click that follows
			turn(dx < 0 ? 'next' : 'previous');
		}
	}

	let fullscreen = $state(false);
	function toggleFullscreen() {
		if (document.fullscreenElement) {
			void document.exitFullscreen();
		} else {
			void reader?.requestFullscreen();
		}
	}

	function onFullscreenChange() {
		fullscreen = document.fullscreenElement !== null;
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
<svelte:document onfullscreenchange={onFullscreenChange} />

{#if book}
	<div class="reader" bind:this={reader}>
		<button
			class="pages"
			class:two={view?.two}
			class:loading
			class:zoomed
			onclick={onTap}
			onpointerdown={onPointerDown}
			onpointerup={onPointerUp}
			onpointercancel={() => (swipeStart = undefined)}
			aria-label="Tap the left third for the previous page, the right third for the next, the middle for the menu"
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

		<header class:visible={toolbar} inert={!toolbar}>
			<a class="button" href={resolve('/books')}>‹ Library</a>
			<a class="button" href={resolve('/book/[bookName]', { bookName })}>Pages</a>
			<span class="title">{bookName}</span>
			{#if supportsFullscreen}
				<button onclick={toggleFullscreen}>{fullscreen ? 'Exit full screen' : 'Full screen'}</button
				>
			{/if}
		</header>

		<span class="position" aria-live="polite">{position}</span>
	</div>
{:else if loaded}
	<p class="not-found">
		This book isn't in your library on this device. <a href={resolve('/books')}>Go to library</a>
	</p>
{/if}

<style>
	.reader {
		position: relative;
		height: 100dvh;
		background: var(--bg);
		overflow: hidden;
	}

	.pages {
		appearance: none;
		border: none;
		border-radius: 0;
		padding: 0;
		margin: 0;
		width: 100%;
		height: 100%;
		min-height: 0;
		background: transparent;
		color: inherit;
		font: inherit;
		display: flex;
		justify-content: center;
		align-items: center;
		gap: 0.25rem;
		cursor: pointer;
		-webkit-tap-highlight-color: transparent;
		touch-action: pan-y pinch-zoom;
		user-select: none;
	}

	.pages.zoomed {
		touch-action: manipulation;
	}

	.pages:focus-visible {
		outline: none;
	}

	img {
		max-height: 100%;
		max-width: 100%;
		object-fit: contain;
		-webkit-user-drag: none;
	}

	.two img {
		max-width: calc(50% - 0.125rem);
	}

	.loading img {
		opacity: 0.5;
	}

	.loader {
		position: absolute;
		inset: auto 0 1.5rem;
		color: var(--text-muted);
	}

	.missing {
		color: var(--text-muted);
	}

	header {
		position: absolute;
		inset: 0 0 auto;
		display: flex;
		align-items: center;
		gap: 0.5rem;
		padding: max(0.5rem, env(safe-area-inset-top)) 0.75rem 0.5rem;
		background: color-mix(in srgb, var(--bg) 92%, transparent);
		border-bottom: 1px solid var(--border);
		box-shadow: 0 2px 12px rgb(0 0 0 / 0.15);
		transform: translateY(-110%);
		transition: transform 0.2s ease;
	}

	header.visible {
		transform: none;
	}

	.title {
		flex: 1;
		min-width: 0;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
		color: var(--text-muted);
	}

	.position {
		position: absolute;
		right: 0.75rem;
		bottom: max(0.5rem, env(safe-area-inset-bottom));
		padding: 0.125rem 0.5rem;
		border-radius: 0.5rem;
		background: color-mix(in srgb, var(--bg) 80%, transparent);
		color: var(--text-muted);
		font-size: 0.875rem;
		font-variant-numeric: tabular-nums;
		pointer-events: none;
	}

	.not-found {
		padding: 2rem 1rem;
	}

	@media (prefers-reduced-motion: reduce) {
		header {
			transition: none;
		}
	}
</style>
