<script lang="ts">
	import { books } from '$lib/stores/books';
</script>

{#if $books.size > 0}
	<ul>
		{#each $books as [bookName]}
			<li>{bookName}</li>
		{/each}
	</ul>
{:else}
	<p>No books uploaded yet</p>
{/if}
