<script lang="ts">
export let tags: string[] = [];
export let basePath: string | null = null;

const buildHref = (tag: string) =>
	basePath ? `${basePath}?tag=${encodeURIComponent(tag)}` : null;
</script>

{#if tags.length > 0}
	<ul class="flex flex-wrap gap-2">
		{#each tags as tag}
			<li>
				{#if basePath}
					<a
						class="inline-flex items-center rounded-full border border-sand-200 bg-white px-3 py-1 text-xs font-semibold text-ink-600 transition hover:border-sage-500/40 hover:text-sage-700"
						href={buildHref(tag)}
					>
						{tag}
					</a>
				{:else}
					<span
						class="inline-flex items-center rounded-full border border-sand-200 bg-white px-3 py-1 text-xs font-semibold text-ink-600"
					>
						{tag}
					</span>
				{/if}
			</li>
		{/each}
	</ul>
{/if}
