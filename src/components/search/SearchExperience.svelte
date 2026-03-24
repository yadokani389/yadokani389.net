<svelte:options runes={false} />

<script lang="ts">
	import { onMount } from "svelte";
	import { buildSearchQueries } from "../../lib/search/query";

	type SearchKind = "all" | "blog" | "works";

	export type SearchSeedEntry = {
		title: string;
		description: string;
		href: string;
		kind: "blog" | "works";
		kindLabel: string;
		dateValue: number;
		dateLabel: string;
	};

	export type SearchStats = {
		blogCount: number;
		worksCount: number;
		totalCount: number;
	};

	interface SearchOption {
		value: SearchKind;
		label: string;
		count: number;
	}

	interface SearchSubResult {
		title: string;
		url: string;
		excerpt?: string;
	}

	interface PagefindSearchResultData {
		url: string;
		excerpt?: string;
		meta: Record<string, string>;
		sub_results?: SearchSubResult[];
	}

	interface PagefindSearchEntry {
		id: string;
		data: () => Promise<PagefindSearchResultData>;
	}

	interface PagefindSearchResponse {
		results: PagefindSearchEntry[];
	}

	interface SearchFilters {
		type?: "blog" | "works";
	}

	interface PagefindSearchOptions {
		filters?: SearchFilters;
		sort?: {
			date: "asc" | "desc";
		};
	}

	interface PagefindModule {
		init: () => Promise<void>;
		search: (
			term: string,
			options?: PagefindSearchOptions,
		) => Promise<PagefindSearchResponse>;
	}

	interface SearchResultViewModel {
		url: string;
		title: string;
		kind: "blog" | "works";
		kindLabel: string;
		dateLabel: string;
		excerptSegments: ExcerptSegment[];
		sectionTitle: string | null;
	}

	interface ExcerptSegment {
		text: string;
		highlighted: boolean;
	}

	export let recentEntries: SearchSeedEntry[] = [];
	export let searchStats: SearchStats = {
		blogCount: 0,
		worksCount: 0,
		totalCount: 0,
	};

	const searchDelayMs = 180;

	let pagefind: PagefindModule | null = null;
	let pagefindError = "";
	let hasMounted = false;
	let isReady = false;
	let isLoading = false;
	let query = "";
	let selectedType: SearchKind = "all";
	let results: SearchResultViewModel[] = [];
	let filteredRecentEntries: SearchSeedEntry[] = [];
	let inputElement: HTMLInputElement | null = null;
	let searchTimer: ReturnType<typeof setTimeout> | undefined;
	let activeSearchToken = 0;
	let searchOptions: SearchOption[] = [];
	let selectedTypeLabel = "All";

	const escapeHtml = (value: string): string =>
		value
			.replaceAll("&", "&amp;")
			.replaceAll("<", "&lt;")
			.replaceAll(">", "&gt;")
			.replaceAll('"', "&quot;")
			.replaceAll("'", "&#39;");

	const normalizeSearchText = (value: string): string =>
		value.toLocaleLowerCase("ja-JP").replace(/\s+/gu, "");

	const getTypeLabel = (value: SearchKind): string => {
		if (value === "blog") {
			return "Blog";
		}

		if (value === "works") {
			return "Works";
		}

		return "All";
	};

	const isTextInputTarget = (target: EventTarget | null): boolean => {
		if (!(target instanceof HTMLElement)) {
			return false;
		}

		return (
			target.isContentEditable ||
			target.tagName === "INPUT" ||
			target.tagName === "TEXTAREA" ||
			target.tagName === "SELECT"
		);
	};

	const appendExcerptSegment = (
		segments: ExcerptSegment[],
		text: string,
		highlighted: boolean,
	) => {
		const normalized = text.replace(/\s+/gu, " ");
		if (!normalized.trim()) {
			return;
		}

		const lastSegment = segments.at(-1);
		if (lastSegment && lastSegment.highlighted === highlighted) {
			lastSegment.text += normalized;
			return;
		}

		segments.push({ text: normalized, highlighted });
	};

	const parseExcerptSegments = (value: string): ExcerptSegment[] => {
		if (!value) {
			return [];
		}

		const parsed = new DOMParser().parseFromString(
			`<body>${value}</body>`,
			"text/html",
		);
		const segments: ExcerptSegment[] = [];

		const visit = (node: ChildNode, highlighted = false) => {
			if (node.nodeType === Node.TEXT_NODE) {
				appendExcerptSegment(segments, node.textContent ?? "", highlighted);
				return;
			}

			if (!(node instanceof HTMLElement)) {
				return;
			}

			const nextHighlighted = highlighted || node.tagName === "MARK";
			for (const child of Array.from(node.childNodes)) {
				visit(child, nextHighlighted);
			}
		};

		for (const child of Array.from(parsed.body.childNodes)) {
			visit(child);
		}

		const firstSegment = segments[0];
		if (firstSegment) {
			firstSegment.text = firstSegment.text.replace(/^[.。\s]+/u, "");
			if (!firstSegment.text.trim()) {
				segments.shift();
			}
		}

		return segments;
	};

	const readUrlState = () => {
		const searchParams = new URLSearchParams(window.location.search);
		query = searchParams.get("q")?.trim() ?? "";
		const nextType = searchParams.get("type");
		selectedType =
			nextType === "blog" || nextType === "works" ? nextType : "all";
	};

	const writeUrlState = (nextQuery: string, nextType: SearchKind) => {
		const searchParams = new URLSearchParams(window.location.search);
		const trimmed = nextQuery.trim();

		if (trimmed) {
			searchParams.set("q", trimmed);
		} else {
			searchParams.delete("q");
		}

		if (nextType !== "all") {
			searchParams.set("type", nextType);
		} else {
			searchParams.delete("type");
		}

		const nextUrl = searchParams.size > 0
			? `${window.location.pathname}?${searchParams.toString()}`
			: window.location.pathname;

		history.replaceState(history.state, "", nextUrl);
	};

	const clearPendingSearch = () => {
		if (searchTimer) {
			clearTimeout(searchTimer);
			searchTimer = undefined;
		}
	};

	const buildSearchFilters = (kind: SearchKind): SearchFilters | undefined => {
		if (kind === "all") {
			return undefined;
		}

		return { type: kind };
	};

	const ensurePagefind = async (): Promise<PagefindModule | null> => {
		if (pagefind) {
			return pagefind;
		}

		try {
			const imported = (await import(
				/* @vite-ignore */
				"/pagefind/pagefind.js"
			)) as unknown as PagefindModule;
			await imported.init();
			pagefind = imported;
			isReady = true;
			pagefindError = "";
			return imported;
		} catch (error) {
			console.error(error);
			pagefindError =
				"検索インデックスを準備中です。`pnpm run build` の後に検索できます。";
			isReady = false;
			return null;
		}
	};

	const mergeSearchEntries = (
		responses: PagefindSearchResponse[],
	): PagefindSearchEntry[] => {
		const merged = new Map<string, PagefindSearchEntry>();

		for (const response of responses) {
			for (const entry of response.results) {
				if (!merged.has(entry.id)) {
					merged.set(entry.id, entry);
				}
			}
		}

		return Array.from(merged.values());
	};

	const pickBestMatch = (data: PagefindSearchResultData) => {
		const title = data.meta.title ?? "Untitled";
		const matchedSection = data.sub_results?.find(
			(section) => section.url !== data.url,
		);

		return {
			url: matchedSection?.url ?? data.url,
			excerptHtml:
				matchedSection?.excerpt ??
				data.excerpt ??
				escapeHtml(data.meta.description ?? ""),
			sectionTitle:
				matchedSection && matchedSection.title !== title
					? matchedSection.title
					: null,
		};
	};

	const toSearchResult = (
		data: PagefindSearchResultData,
		queryTerm: string,
	): SearchResultViewModel => {
		const title = data.meta.title ?? "Untitled";
		const kind = data.meta.type === "works" ? "works" : "blog";
		const match = pickBestMatch(data);
		const description = data.meta.description ?? "";
		const queryMatchesTitle =
			normalizeSearchText(queryTerm).length > 0 &&
			normalizeSearchText(title).includes(normalizeSearchText(queryTerm));
		const excerptSource =
			queryMatchesTitle && !match.sectionTitle && description
				? escapeHtml(description)
				: match.excerptHtml;

		return {
			url: match.url,
			title,
			kind,
			kindLabel: data.meta.kind ?? getTypeLabel(kind),
			dateLabel: data.meta.dateLabel ?? "",
			excerptSegments: parseExcerptSegments(excerptSource),
			sectionTitle: match.sectionTitle,
		};
	};

	const runSearch = async (nextQuery: string, nextType: SearchKind) => {
		const trimmed = nextQuery.trim();
		const searchToken = ++activeSearchToken;

		clearPendingSearch();

		if (!trimmed) {
			results = [];
			isLoading = false;
			return;
		}

		pagefindError = "";
		const api = await ensurePagefind();
		if (!api || searchToken !== activeSearchToken) {
			isLoading = false;
			return;
		}

		try {
			const responses = await Promise.all(
				buildSearchQueries(trimmed).map((term) =>
					api.search(term, {
						filters: buildSearchFilters(nextType),
						sort: { date: "desc" },
					}),
				),
			);

			const hydratedResults = await Promise.all(
				mergeSearchEntries(responses).map(async (entry) =>
					toSearchResult(await entry.data(), trimmed),
				),
			);

			if (searchToken !== activeSearchToken) {
				return;
			}

			results = hydratedResults;
			pagefindError = "";
		} catch (error) {
			console.error(error);
			if (searchToken !== activeSearchToken) {
				return;
			}

			results = [];
			pagefindError =
				"検索中に問題が起きました。少し待ってからもう一度試してください。";
		} finally {
			if (searchToken === activeSearchToken) {
				isLoading = false;
			}
		}
	};

	const scheduleSearch = (nextQuery: string, nextType: SearchKind) => {
		clearPendingSearch();

		if (!nextQuery.trim()) {
			activeSearchToken += 1;
			results = [];
			isLoading = false;
			return;
		}

		isLoading = true;
		searchTimer = setTimeout(() => {
			void runSearch(nextQuery, nextType);
		}, searchDelayMs);
	};

	const handleSearchStateChange = (nextQuery: string, nextType: SearchKind) => {
		writeUrlState(nextQuery, nextType);
		scheduleSearch(nextQuery, nextType);
	};

	const resetQuery = () => {
		query = "";
		inputElement?.focus();
	};

	const handleGlobalKeydown = (event: KeyboardEvent) => {
		if (
			event.key === "/" &&
			!event.metaKey &&
			!event.ctrlKey &&
			!event.altKey &&
			!isTextInputTarget(event.target)
		) {
			event.preventDefault();
			inputElement?.focus();
			inputElement?.select();
			return;
		}

		if (event.key === "Escape" && document.activeElement === inputElement) {
			event.preventDefault();
			resetQuery();
		}
	};

	const handleInputFocus = () => {
		void ensurePagefind();
	};

	$: searchOptions = [
		{ value: "all", label: "All", count: searchStats.totalCount },
		{ value: "blog", label: "Blog", count: searchStats.blogCount },
		{ value: "works", label: "Works", count: searchStats.worksCount },
	];

	$: selectedTypeLabel = getTypeLabel(selectedType);

	$: filteredRecentEntries =
		selectedType === "all"
			? recentEntries
			: recentEntries.filter((entry) => entry.kind === selectedType);

	$: if (hasMounted) {
		handleSearchStateChange(query, selectedType);
	}

	onMount(() => {
		readUrlState();
		hasMounted = true;

		const handlePopState = () => {
			readUrlState();
		};

		window.addEventListener("keydown", handleGlobalKeydown);
		window.addEventListener("popstate", handlePopState);

		return () => {
			window.removeEventListener("keydown", handleGlobalKeydown);
			window.removeEventListener("popstate", handlePopState);
			clearPendingSearch();
		};
	});
</script>

<div class="search-shell">
	<div class="search-controls">
		<label class="search-field" aria-label="記事を検索">
			<svg
				class="search-icon"
				viewBox="0 0 24 24"
				fill="none"
				stroke="currentColor"
				stroke-width="1.8"
				stroke-linecap="round"
				stroke-linejoin="round"
				aria-hidden="true"
			>
				<circle cx="11" cy="11" r="7"></circle>
				<path d="m20 20-3.5-3.5"></path>
			</svg>
			<input
				bind:this={inputElement}
				class="search-input"
				type="search"
				placeholder="キーワード、タグ、本文から検索"
				bind:value={query}
				autocomplete="off"
				on:focus={handleInputFocus}
			/>
			{#if query.trim()}
				<button
					type="button"
					class="clear-button"
					on:click={resetQuery}
					aria-label="検索語をクリア"
				>
					×
				</button>
			{/if}
		</label>

		<div class="search-toolbar">
			<div class="type-switcher" role="group" aria-label="検索対象">
				{#each searchOptions as option (option.value)}
					<button
						type="button"
						class:selected={selectedType === option.value}
						on:click={() => {
							selectedType = option.value;
						}}
						aria-pressed={selectedType === option.value}
					>
						<span>{option.label}</span>
						<span class="type-count">{option.count}</span>
					</button>
				{/each}
			</div>

			<p class="search-status" aria-live="polite">
				{#if pagefindError && query.trim()}
					{pagefindError}
				{:else if isLoading}
					検索中...
				{:else if query.trim()}
					{results.length}件
				{:else if selectedType === "all"}
					最新6件
				{:else}
					{selectedTypeLabel} {filteredRecentEntries.length}件
				{/if}
			</p>
		</div>
	</div>

	{#if pagefindError && query.trim()}
		<section class="empty-state">
			<p>{pagefindError}</p>
		</section>
	{:else if !query.trim()}
		<section class="results-block" aria-label="最近の公開内容">
			<div class="block-header">
				<h2>最近の公開内容</h2>
				{#if selectedType !== "all"}
					<p>{selectedTypeLabel}</p>
				{/if}
			</div>
			<ul class="results-list">
				{#each filteredRecentEntries as entry (entry.href)}
					<li>
						<a class="result-link" href={entry.href}>
							<div class="result-meta">
								<span class={`kind-pill kind-pill--${entry.kind}`}>
									{entry.kindLabel}
								</span>
								<time>{entry.dateLabel}</time>
							</div>
							<div class="result-main">
								<div class="result-copy">
									<h3>{entry.title}</h3>
									<p>{entry.description}</p>
								</div>
								<span class="result-arrow" aria-hidden="true">→</span>
							</div>
						</a>
					</li>
				{/each}
			</ul>
		</section>
	{:else if isLoading}
		<section class="empty-state">
			<p>検索中...</p>
		</section>
	{:else if results.length > 0}
		<section class="results-block">
			<div class="block-header">
				<h2>検索結果</h2>
				<p>{results.length}件 / 新しい順</p>
			</div>
			<ol class="results-list" aria-live="polite">
				{#each results as result (result.url)}
					<li>
						<a class="result-link" href={result.url}>
							<div class="result-meta">
								<span class={`kind-pill kind-pill--${result.kind}`}>
									{result.kindLabel}
								</span>
								{#if result.dateLabel}
									<time>{result.dateLabel}</time>
								{/if}
							</div>
							<div class="result-main">
								<div class="result-copy">
									<h3>{result.title}</h3>
									{#if result.sectionTitle}
										<p class="result-section">{result.sectionTitle}</p>
									{/if}
									{#if result.excerptSegments.length > 0}
										<p class="search-result-excerpt">
											{#each result.excerptSegments as segment, segmentIndex (segmentIndex)}
												<span class:highlighted={segment.highlighted}>
													{segment.text}
												</span>
											{/each}
										</p>
									{/if}
								</div>
								<span class="result-arrow" aria-hidden="true">↗</span>
							</div>
						</a>
					</li>
				{/each}
			</ol>
		</section>
	{:else}
		<section class="empty-state">
			<p>一致する結果はありません。</p>
			<p class="empty-detail">検索語を変えるか、対象を切り替えて試してください。</p>
		</section>
	{/if}
</div>

<style>
	.search-shell {
		display: grid;
		gap: 1rem;
	}

	.search-controls {
		display: grid;
		gap: 0.75rem;
	}

	.search-field {
		display: flex;
		align-items: center;
		gap: 0.75rem;
		border: 1px solid var(--color-sand-200);
		border-radius: 0.9rem;
		background: color-mix(in oklab, var(--color-sand-50) 94%, white);
		padding: 0 0.8rem;
		transition:
			border-color 160ms ease,
			box-shadow 160ms ease,
			background-color 160ms ease;
	}

	.search-field:focus-within {
		border-color: color-mix(in oklab, var(--color-sage-500) 45%, var(--color-sand-200));
		box-shadow: 0 0 0 3px color-mix(in oklab, var(--color-sage-500) 10%, transparent);
		background: var(--color-sand-50);
	}

	.search-icon {
		height: 1rem;
		width: 1rem;
		flex-shrink: 0;
		color: var(--color-ink-500);
	}

	.search-input {
		width: 100%;
		border: 0;
		background: transparent;
		padding: 0.85rem 0;
		font: inherit;
		font-size: 1rem;
		color: var(--color-ink-900);
	}

	.search-input::placeholder {
		color: var(--color-ink-500);
		opacity: 1;
	}

	.search-input:focus {
		outline: none;
	}

	.clear-button {
		border: 0;
		background: transparent;
		padding: 0.25rem;
		font: inherit;
		font-size: 1.1rem;
		line-height: 1;
		color: var(--color-ink-500);
		cursor: pointer;
	}

	.clear-button:hover {
		color: var(--color-ink-900);
	}

	.clear-button:focus-visible,
	.type-switcher button:focus-visible,
	.result-link:focus-visible {
		outline: none;
		box-shadow: 0 0 0 3px color-mix(in oklab, var(--color-sage-500) 12%, transparent);
	}

	.search-toolbar {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		justify-content: space-between;
		gap: 0.75rem;
	}

	.type-switcher {
		display: flex;
		flex-wrap: wrap;
		gap: 0.5rem;
	}

	.type-switcher button {
		display: inline-flex;
		align-items: center;
		gap: 0.45rem;
		border: 1px solid var(--color-sand-200);
		border-radius: 999px;
		background: transparent;
		padding: 0.42rem 0.75rem;
		font: inherit;
		font-size: 0.88rem;
		font-weight: 600;
		color: var(--color-ink-700);
		cursor: pointer;
		transition:
			border-color 160ms ease,
			color 160ms ease,
			background-color 160ms ease;
	}

	.type-switcher button:hover,
	.type-switcher button.selected {
		border-color: color-mix(in oklab, var(--color-sage-500) 40%, var(--color-sand-200));
		background: color-mix(
			in oklab,
			var(--color-sage-500) 12%,
			var(--color-sand-100)
		);
		color: var(--color-ink-900);
	}

	.type-count {
		font-size: 0.78rem;
		color: var(--color-ink-500);
	}

	.search-status {
		margin: 0;
		font-size: 0.88rem;
		color: var(--color-ink-500);
	}

	.results-block,
	.empty-state {
		border-top: 1px solid var(--color-sand-200);
		padding-top: 0.95rem;
	}

	.block-header {
		display: flex;
		flex-wrap: wrap;
		align-items: baseline;
		justify-content: space-between;
		gap: 0.5rem;
		margin-bottom: 0.35rem;
	}

	.block-header h2 {
		margin: 0;
		font-size: 1rem;
		font-weight: 700;
		color: var(--color-ink-900);
	}

	.block-header p,
	.empty-state p {
		margin: 0;
		font-size: 0.9rem;
		color: var(--color-ink-500);
	}

	.empty-detail {
		margin-top: 0.35rem;
	}

	.results-list {
		margin: 0;
		padding: 0;
		list-style: none;
	}

	.results-list li {
		border-top: 1px solid var(--color-sand-200);
	}

	.results-list li:first-child {
		border-top: 0;
	}

	.result-link {
		display: block;
		margin-inline: -0.4rem;
		border-radius: 0.9rem;
		padding: 0.9rem 0.4rem;
		transition: background-color 160ms ease;
	}

	.result-link:hover {
		color: inherit;
		background: color-mix(in oklab, var(--color-sand-100) 72%, transparent);
	}

	.result-meta {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		gap: 0.6rem;
		font-size: 0.78rem;
		color: var(--color-ink-500);
	}

	.kind-pill {
		display: inline-flex;
		align-items: center;
		border: 1px solid var(--color-sand-200);
		border-radius: 999px;
		padding: 0.12rem 0.45rem;
		font-size: 0.72rem;
		font-weight: 700;
		letter-spacing: 0.04em;
		text-transform: uppercase;
	}

	.kind-pill--blog {
		color: var(--color-sage-700);
	}

	.kind-pill--works {
		color: var(--color-clay-600);
	}

	.result-main {
		display: flex;
		align-items: flex-start;
		justify-content: space-between;
		gap: 1rem;
		margin-top: 0.35rem;
	}

	.result-copy {
		min-width: 0;
	}

	.result-copy h3 {
		margin: 0;
		font-size: 1.05rem;
		line-height: 1.35;
		color: var(--color-ink-900);
		transition: color 160ms ease;
	}

	.result-link:hover .result-copy h3 {
		color: var(--color-sage-700);
	}

	.result-copy p,
	.search-result-excerpt {
		margin: 0.3rem 0 0;
		font-size: 0.92rem;
		line-height: 1.75;
		color: var(--color-ink-600);
	}

	.result-section {
		font-size: 0.8rem;
		color: var(--color-ink-500);
	}

	.result-arrow {
		flex-shrink: 0;
		font-size: 1rem;
		line-height: 1;
		color: var(--color-ink-400, var(--color-ink-500));
		transition: color 160ms ease;
	}

	.result-link:hover .result-arrow,
	.result-link:focus-visible .result-arrow {
		color: var(--color-sage-600);
	}

	.search-result-excerpt span.highlighted {
		background: color-mix(in oklab, var(--color-sage-500) 16%, white);
		border-radius: 0.2rem;
		padding: 0 0.15rem;
		color: var(--color-ink-900);
	}

	@media (max-width: 640px) {
		.search-toolbar {
			align-items: flex-start;
		}

		.result-main {
			gap: 0.75rem;
		}

		.result-link {
			margin-inline: -0.35rem;
			padding-inline: 0.35rem;
		}
	}
</style>
