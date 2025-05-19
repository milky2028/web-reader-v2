<script lang="ts">
	import { deleteAllBooks } from '$lib/filesystem/deleteAllBooks';
	import { books } from '$lib/stores/books';
	import { pages } from '$lib/stores/pages';
	import { derived } from 'svelte/store';

	const covers = derived([books, pages], ([$books, _$pages]) =>
		Promise.all(
			[...$books]
				.sort(([bookNameA], [bookNameB]) => bookNameA.localeCompare(bookNameB))
				.map(async ([bookName, { coverName, lastPage }]) => ({
					bookName,
					coverImg: await pages.getPage($books, bookName, coverName),
					lastPage
				}))
		)
	);

	function deleteAll() {
		books.reset();
		deleteAllBooks();
	}
</script>

<style>
	ul {
		list-style: none;
		margin: 0.5rem;
		padding: 0;
		display: flex;
		gap: 1rem;
		flex-flow: row wrap;
	}

	li {
		display: grid;
		grid-template-areas: 'main';
		width: min-content;
	}

	img {
		height: 100%;
		object-fit: cover;
	}

	button {
		align-self: end;
		justify-self: end;
		cursor: pointer;
		border-radius: 0.25rem;
		margin: 0.25rem;
		padding: 0.25rem 0.5rem;
	}
</style>

<svelte:head>
	<title>Comic Reader</title>
</svelte:head>

{#await $covers}
	<div>Loading...</div>
{:then cover}
	{#if $books.size === 0}
		<p>No books uploaded yet</p>
	{:else}
		<button on:click={deleteAll}>Delete all</button>
		<ul>
			{#each cover as { bookName, coverImg, lastPage } (bookName)}
				<li>
					<a href="/book/{bookName}/page/{lastPage}" style="grid-area: main;">
						<img src={coverImg} loading="lazy" alt={bookName} width="200" />
					</a>
					<button on:click={() => books.remove(bookName)} style="grid-area: main;">X</button>
				</li>
			{/each}
		</ul>
	{/if}
{/await}
