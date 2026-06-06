/**
 * MDX → Astro component compiler.
 *
 * Transforms Notion markdown into an Astro component via two passes:
 * 1. preprocessNotionMarkdown() + applyMdxContext() — string-level transforms
 *    that produce clean MDX JSX (callouts, element renames, heading IDs, etc.)
 * 2. evaluate() from @mdx-js/mdx — compiles the clean MDX into an Astro component
 *    using Astro's jsx-runtime. No remark or rehype plugins are needed.
 */

import { evaluate } from '@mdx-js/mdx';
import { createHash } from 'node:crypto';
import { preprocessNotionMarkdown, applyMdxContext } from './notion-preprocess.ts';
import type { LinkToPages } from '../types.ts';

// Import Astro's jsx-runtime so evaluate() produces Astro VNodes.
// (astro/src/jsx-runtime/index.ts:94)
import { Fragment, jsx, jsxs } from 'astro/jsx-runtime';

// Required to register Content as an 'astro:jsx' renderer.
// Equivalent to annotateContentExport() in vite-plugin-mdx-postprocess.ts.
import { __astro_tag_component__ } from 'astro/runtime/server/index.js';

// ── Core compile function ──────────────────────────────────────────────────

/**
 * Compiles a preprocessed Notion markdown string into an Astro component
 * that can be rendered with <Content components={notionComponents} />.
 *
 * @param mdxSource - Preprocessed markdown string (from loader store)
 * @param options.linkToPages - Optional map for resolving Notion page URLs
 *
 * @example
 * ```astro
 * ---
 * const Content = await compileMdxForAstro(entry.data.markdown, { linkToPages });
 * ---
 * <Content components={notionComponents} />
 * ```
 */
export async function compileMdxForAstro(
	mdxSource: string,
	options: { linkToPages?: LinkToPages } = {},
) {
	const { linkToPages = {} } = options;

	// Two-pass string preprocessing produces clean MDX that evaluate() can
	// compile without any remark or rehype plugins:
	//   1. preprocessNotionMarkdown() — structural fixes, callout→JSX, element
	//      renaming, color→className, strikethrough, task lists, void elements
	//   2. applyMdxContext() — heading ID anchors, TOC population, page link resolution
	const processedSource = applyMdxContext(
		preprocessNotionMarkdown(mdxSource),
		{ linkToPages },
	);

	// evaluate() compiles + executes the MDX using Astro's jsx-runtime,
	// producing a function that returns Astro VNodes.
	// Wrapped in try-catch so a broken page does not crash the entire build.
	let mod: Awaited<ReturnType<typeof evaluate>>;
	try {
		mod = await evaluate(processedSource, {
			jsx,
			jsxs,
			Fragment,
		});
	} catch (error) {
		console.warn(
			`[notro] MDX compilation failed for markdown (${processedSource.length} chars):`,
			error,
		);
		// Return a fallback component that renders an error message so the build
		// continues and the problem is visible in the output without a 500 error.
		const errorMessage = error instanceof Error ? error.message : String(error);
		const FallbackContent = (props: Record<string, unknown> = {}) => {
			void props;
			return jsx('div', {
				style: 'border:2px solid red;padding:1em;color:red;white-space:pre-wrap',
				children: `[notro] MDX compilation error:\n${errorMessage}`,
			});
		};
		FallbackContent[Symbol.for('astro.needsHeadRendering')] = true;
		__astro_tag_component__(FallbackContent, 'astro:jsx');
		return FallbackContent;
	}
	const MDXContent = mod.default;

	// Pick up any `export const components = {...}` defined inside the MDX source.
	const mdxInternalComponents = (mod as Record<string, unknown>).components ?? {};

	// Wraps MDXContent so props.components are merged in priority order:
	//   1. Caller's <Content components={{...}} />
	//   2. MDX-internal `export const components`
	//   3. Fragment (required)
	const Content = (props: Record<string, unknown> = {}) =>
		MDXContent({
			...props,
			components: {
				Fragment,
				...(mdxInternalComponents as Record<string, unknown>),
				...(props.components as Record<string, unknown> | undefined),
			},
		});

	// Tag the component so Astro's rendering pipeline handles it correctly.
	// Symbol.for("astro.needsHeadRendering") is checked by Astro's component renderer.
	// __astro_tag_component__ sets Symbol.for("astro:renderer") = 'astro:jsx',
	// which routes rendering through Astro's built-in JSX renderer.
	Content[Symbol.for('astro.needsHeadRendering')] = true;
	__astro_tag_component__(Content, 'astro:jsx');

	return Content;
}

// ── Cached variant ─────────────────────────────────────────────────────────

// In-memory promise cache: keyed by SHA-256(mdxSource + linkToPages JSON).
// Stores the Promise itself (not the resolved value) so that concurrent calls
// with the same key share the in-flight compilation instead of launching
// duplicate evaluate() calls. The cache is intentionally module-scoped and
// lives for the duration of the build process.
//
// Known limitation: JSON.stringify(linkToPages) is insertion-order dependent.
// Two objects with the same key/value pairs but different insertion order
// produce different cache keys. In practice this is not a problem because
// `buildLinkToPages()` always produces a consistent insertion order, but
// custom linkToPages objects constructed in different orders would create
// redundant cache entries rather than sharing results.

// Maximum number of entries kept in compilationCache.
// When the limit is reached, the oldest entry (first inserted) is evicted
// using Map's guaranteed insertion-order iteration (FIFO eviction).
const MAX_CACHE_SIZE = 500;
const compilationCache = new Map<string, ReturnType<typeof compileMdxForAstro>>();

export async function compileMdxCached(
	mdxSource: string,
	options: { linkToPages?: LinkToPages } = {},
) {
	const linkToPages = options.linkToPages ?? {};
	const key = createHash('sha256')
		.update(mdxSource)
		.update(JSON.stringify(linkToPages))
		.digest('hex');

	let entry = compilationCache.get(key);
	if (!entry) {
		// Evict the oldest entry (FIFO) before inserting a new one to keep
		// memory usage bounded. Eviction is skipped when the current key is
		// already present (cache hit), but a cache miss always inserts a new
		// entry, so we check the size here before that insertion.
		if (compilationCache.size >= MAX_CACHE_SIZE) {
			const oldestKey = compilationCache.keys().next().value;
			if (oldestKey !== undefined) {
				compilationCache.delete(oldestKey);
			}
		}

		// Store the promise immediately so concurrent callers share the same
		// in-flight compilation. On error, evict the cache entry so the next
		// request retries compilation rather than replaying the failure.
		const promise = compileMdxForAstro(mdxSource, options);
		compilationCache.set(key, promise);
		promise.catch(() => compilationCache.delete(key));
		entry = promise;
	}
	return entry;
}
