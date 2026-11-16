<script lang="ts">
	import { getThumbnailUrl } from '#lib/pages.ts';
	import type { BookDetails } from '#lib/stores/books.ts';

	type Props = { bookName: string; book: BookDetails; index: number; alt?: string };
	const { bookName, book, index, alt = '' }: Props = $props();

	let element: HTMLElement | undefined = $state();
	let src: string | undefined = $state();

	// Only load (and if needed, generate) thumbnails that are near the viewport.
	$effect(() => {
		if (!element) return;
		const target = { bookName, book, index };
		const observer = new IntersectionObserver(
			([entry]) => {
				if (entry?.isIntersecting) {
					observer.disconnect();
					void getThumbnailUrl(target.bookName, target.book, target.index).then(
						(url) => (src = url)
					);
				}
			},
			{ rootMargin: '600px' }
		);
		observer.observe(element);
		return () => observer.disconnect();
	});
</script>

<div class="thumbnail" bind:this={element}>
	{#if src}
		<img {src} {alt} decoding="async" draggable="false" />
	{/if}
</div>

<style>
	.thumbnail {
		aspect-ratio: 2 / 3;
		width: 100%;
		background: var(--surface);
		border-radius: 0.375rem;
		overflow: hidden;
	}

	img {
		width: 100%;
		height: 100%;
		object-fit: cover;
		display: block;
	}
</style>
