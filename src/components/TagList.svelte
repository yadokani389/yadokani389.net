<script lang="ts">
import { toTagSlug } from "../lib/tags/slug";

export let tags: string[] = [];
export let basePath: string | null = null;

const buildHref = (tag: string) => {
	if (!basePath) {
		return null;
	}

	if (basePath === "/blog") {
		const slug = toTagSlug(tag);
		return `${basePath}/tags/${encodeURIComponent(slug)}`;
	}

	if (basePath === "/works") {
		const slug = toTagSlug(tag);
		return `${basePath}/tags/${encodeURIComponent(slug)}`;
	}

	return null;
};
</script>

{#if tags.length > 0}
	<ul class="flex flex-wrap gap-2">
		{#each tags as tag}
			{@const href = buildHref(tag)}
			<li>
				{#if href}
					<a
						class="inline-flex items-center rounded-full border border-sand-200 bg-sand-50 px-3 py-1 text-xs font-semibold text-ink-600 transition hover:border-sage-500/40 hover:text-sage-700"
						href={href}
					>
						{tag}
					</a>
				{:else}
					<span
						class="inline-flex items-center rounded-full border border-sand-200 bg-sand-50 px-3 py-1 text-xs font-semibold text-ink-600"
					>
						{tag}
					</span>
				{/if}
			</li>
		{/each}
	</ul>
{/if}
