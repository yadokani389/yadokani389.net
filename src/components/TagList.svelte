<script lang="ts">
	import { toTagSlug } from "../lib/tags/slug";

	export let tags: string[] = [];
	export let basePath: string | null = null;

	const buildHref = (tag: string) => {
		if (basePath !== "/blog" && basePath !== "/works") return null;
		return `${basePath}/tags/${encodeURIComponent(toTagSlug(tag))}`;
	};
</script>

{#if tags.length > 0}
	<ul class="flex flex-wrap gap-2">
		{#each tags as tag, index (index)}
			{@const href = buildHref(tag)}
			<li>
				{#if href}
					<a
						class="relative z-10 inline-flex min-h-8 items-center rounded-sm bg-sand-100 px-2 py-1 text-xs font-semibold text-ink-600 transition hover:text-sage-700"
						{href}
					>
						{tag}
					</a>
				{:else}
					<span
						class="inline-flex items-center rounded-sm bg-sand-100 px-2 py-1 text-xs font-semibold text-ink-600"
					>
						{tag}
					</span>
				{/if}
			</li>
		{/each}
	</ul>
{/if}
