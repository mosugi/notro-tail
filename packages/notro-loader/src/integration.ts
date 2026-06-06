/**
 * Astro integration for notro.
 *
 * Injects `@astrojs/mdx` with notro's plugin suite, which:
 * 1. Registers the `astro:jsx` renderer — required for `@mdx-js/mdx`'s `evaluate()`
 *    to work in Astro's SSG prerender pipeline.
 * 2. Configures static `.mdx` files in the project with user-provided
 *    remark/rehype plugins (shikiConfig, remarkPlugins, rehypePlugins).
 *
 * Notion content (the runtime evaluate() path) is handled entirely at string
 * level by preprocessNotionMarkdown() and applyMdxContext() in compile-mdx.ts —
 * no remark/rehype plugins are applied there.
 *
 * Usage in astro.config.mjs:
 * ```js
 * import { notro } from 'notro/integration';
 * import { rehypeMermaid } from 'rehype-beautiful-mermaid';
 * import remarkMath from 'remark-math';
 * import rehypeKatex from 'rehype-katex';
 *
 * export default defineConfig({
 *   integrations: [
 *     notro({
 *       shikiConfig: { theme: 'github-dark' },
 *       remarkPlugins: [remarkMath],
 *       rehypePlugins: [
 *         [rehypeMermaid, { theme: 'github-dark' }],
 *         rehypeKatex,
 *       ],
 *     }),
 *   ],
 * });
 * ```
 */

import type { AstroIntegration } from 'astro';
import type { PluggableList } from 'unified';
import type { MarkdownProcessor } from '@astrojs/markdown-remark';
import mdx from '@astrojs/mdx';
import { isSatteriProcessor } from '@astrojs/markdown-satteri';
import { buildSatteriMdastPlugins } from './utils/satteri-plugins.ts';

/**
 * Options for the notro() Astro integration.
 * Mirrors the @astrojs/mdx interface for familiarity.
 */
export interface NotroOptions {
	/**
	 * Remark plugins for static `.mdx` files processed by @astrojs/mdx.
	 * These do NOT apply to runtime Notion content — Notion markdown is
	 * preprocessed at string level by preprocessNotionMarkdown().
	 *
	 * @example [remarkMath]  // from 'remark-math'
	 */
	remarkPlugins?: PluggableList;

	/**
	 * Rehype plugins for static `.mdx` files processed by @astrojs/mdx.
	 * These do NOT apply to runtime Notion content — Notion markdown is
	 * preprocessed at string level by preprocessNotionMarkdown().
	 *
	 * @example [[rehypeMermaid, { theme: 'github-dark' }], rehypeKatex]
	 */
	rehypePlugins?: PluggableList;

	/**
	 * Shiki syntax highlighting configuration.
	 * When provided, @shikijs/rehype is automatically injected as the last rehype
	 * plugin so that other plugins (rehypeMermaid, rehypeKatex) run first.
	 * Equivalent to appending `[rehypeShiki, shikiConfig]` to rehypePlugins.
	 *
	 * Requires @shikijs/rehype to be installed (optional dependency):
	 *   npm install @shikijs/rehype
	 *
	 * @example { theme: 'github-dark' }
	 * @example { themes: { light: 'github-light', dark: 'github-dark' } }
	 */
	shikiConfig?: Record<string, unknown>;

	/**
	 * Additional packages to add to Vite's ssr.external list.
	 * Use this when a rehype/remark plugin dynamically imports a package that
	 * needs to be resolved by Node.js's native ESM loader instead of Vite's
	 * module runner (e.g. packages that use native binaries or dynamic imports).
	 *
	 * @example ['my-native-package']
	 */
	viteExternals?: string[];

	/**
	 * Markdown processor to use for static `.mdx` files processed by @astrojs/mdx.
	 *
	 * - `undefined` (default): notro injects @astrojs/mdx without a processor,
	 *   letting @astrojs/mdx use its own default remark/rehype pipeline.
	 *   remarkPlugins, rehypePlugins, and shikiConfig are passed directly.
	 * - `satteri()` from `@astrojs/markdown-satteri`: opt into Sätteri's
	 *   Rust-based pipeline (takes precedence over the global markdown.processor).
	 *   notro injects its callout MDASTP plugin automatically.
	 *   remarkPlugins, rehypePlugins, and shikiConfig do NOT apply to .mdx files
	 *   (Sätteri does not support remark/rehype), but Notion content is unaffected
	 *   because it is processed at string level.
	 *
	 * Note: the Notion content runtime path (evaluate()) always uses string-level
	 * preprocessing regardless of this option.
	 *
	 * @example
	 * ```js
	 * // Option A — set once globally; notro inherits automatically
	 * import { satteri } from '@astrojs/markdown-satteri';
	 * defineConfig({ markdown: { processor: satteri() } })
	 *
	 * // Option B — explicit override
	 * notro({ processor: satteri() })
	 * ```
	 */
	processor?: MarkdownProcessor;

	/**
	 * Whether to extend Astro's base markdown config.
	 * Same as @astrojs/mdx's extendMarkdownConfig option.
	 * Defaults to false to avoid duplicate plugin registration.
	 */
	extendMarkdownConfig?: boolean;
}

export function notro(options: NotroOptions = {}): AstroIntegration {
	const {
		remarkPlugins = [],
		rehypePlugins = [],
		shikiConfig,
		processor,
		extendMarkdownConfig = false,
		viteExternals = [],
	} = options;

	return {
		name: 'notro',
		hooks: {
			'astro:config:setup': async ({ updateConfig, config }) => {
				// When shikiConfig is provided, dynamically load @shikijs/rehype
				// (optional dependency) and inject it as the last rehype plugin so
				// that diagram/math plugins (rehypeMermaid, rehypeKatex) run first.
				let allRehypePlugins: PluggableList = rehypePlugins;
				if (shikiConfig != null) {
					try {
						// Use new Function to escape Vite's static import analysis.
						// A plain `await import('@shikijs/rehype')` inside an Astro hook
						// is intercepted by Vite's module runner, which may fail to
						// resolve optional packages. new Function forces Node.js's native
						// ESM loader to handle the import at runtime.
						// eslint-disable-next-line @typescript-eslint/no-implied-eval
						const nativeImport = new Function('s', 'return import(s)') as (s: string) => Promise<{ default: unknown }>;
						const mod = await nativeImport('@shikijs/rehype');
						allRehypePlugins = [...rehypePlugins, [mod.default, shikiConfig]];
					} catch {
						throw new Error(
							'[notro] shikiConfig was provided but @shikijs/rehype is not installed.\n' +
							'Run: npm install @shikijs/rehype',
						);
					}
				}

				// Resolve the MDX processor for static .mdx files.
				// Explicit processor option takes precedence; falls back to the global
				// markdown.processor from defineConfig so users don't have to duplicate it.
				const effectiveProcessor = processor ?? config.markdown?.processor;

				if (effectiveProcessor != null && isSatteriProcessor(effectiveProcessor)) {
					// Enable directive parsing so :::callout{...} blocks are parsed as
					// containerDirective nodes that notroCalloutPlugin can transform.
					effectiveProcessor.options.features.directive = true;
					for (const plugin of buildSatteriMdastPlugins()) {
						effectiveProcessor.options.mdastPlugins.push(plugin);
					}
					if (remarkPlugins.length > 0 || rehypePlugins.length > 0 || shikiConfig != null) {
						// eslint-disable-next-line no-console
						console.warn(
							'[notro] remarkPlugins, rehypePlugins, and shikiConfig are not applied to ' +
							'static .mdx files when processor: satteri() is active — Sätteri does not ' +
							'support remark/rehype plugins.',
						);
					}
					// Inject @astrojs/mdx with the Sätteri processor.
					updateConfig({
						integrations: [mdx({
							processor: effectiveProcessor,
							extendMarkdownConfig,
						// `as any` is needed because Astro's TypeScript types for updateConfig
						// only accept AstroIntegration[], but @astrojs/mdx returns its own
						// subtype that is structurally compatible but not assignable.
						})] as any, // eslint-disable-line @typescript-eslint/no-explicit-any

						vite: {
							ssr: {
								// Externalize packages that need Node.js's native ESM loader
								// instead of Vite's module runner (e.g. packages with native
								// binaries or those that use dynamic import at runtime).
								// Configured via notro({ viteExternals: ['my-package'] }).
								external: viteExternals,
							},
						},
					});
				} else {
					if (processor != null) {
						// Only warn when the user explicitly passed an unsupported processor to notro().
						// A non-Satteri global markdown.processor is silently ignored.
						// eslint-disable-next-line no-console
						console.warn(
							'[notro] processor option was provided but is not a Sätteri processor. ' +
							'Only satteri() from @astrojs/markdown-satteri is supported. ' +
							'The processor option has been ignored.',
						);
					}
					// Default path: inject @astrojs/mdx without a processor.
					// remarkPlugins, rehypePlugins, and shikiConfig are passed directly
					// to @astrojs/mdx so they apply to static .mdx files.
					// Notion content is handled entirely at string level by
					// preprocessNotionMarkdown() in compile-mdx.ts.
					updateConfig({
						integrations: [mdx({
							remarkPlugins,
							rehypePlugins: allRehypePlugins,
							extendMarkdownConfig,
						})] as any, // eslint-disable-line @typescript-eslint/no-explicit-any

						vite: {
							ssr: {
								external: viteExternals,
							},
						},
					});
				}
			},
		},
	};
}

// Default export so `astro add notro` generates `import notro from 'notro'`
// which resolves to this file (via the "default" export condition in package.json).
export default notro;
