<script lang="ts">
export let tags: string[] = [];
export let basePath: string | null = null;

const buildHref = (tag: string) =>
	basePath ? `${basePath}?tag=${encodeURIComponent(tag)}` : null;
</script>

{#if tags.length > 0}
	<ul class="tag-list">
		{#each tags as tag}
			<li>
				{#if basePath}
					<a class="tag" href={buildHref(tag)}>{tag}</a>
				{:else}
					<span class="tag">{tag}</span>
				{/if}
			</li>
		{/each}
	</ul>
{/if}
