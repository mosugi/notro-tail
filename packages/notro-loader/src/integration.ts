/**
 * Astro integration for notro.
 *
 * Injects `@astrojs/mdx` with the Sätteri processor, which:
 * 1. Registers the `astro:jsx` renderer — required for `@mdx-js/mdx`'s `evaluate()`
 *    to work in Astro's SSG prerender pipeline.
 * 2. Configures static `.mdx` files in the project with Sätteri's Rust-based
 *    Markdown pipeline. User-provided MDASTP and HAST plugins apply here.
 *
 * Notion content (the runtime evaluate() path) is handled entirely at string
 * level by preprocessNotionMarkdown() and applyMdxContext() in compile-mdx.ts —
 * no remark/rehype or Sätteri plugins are applied there.
 *
 * Usage in astro.config.mjs:
 * ```js
 * import { notro } from 'notro/integration';
 * import { satteriMermaidPlugin } from 'rehype-beautiful-mermaid/satteri';
 *
 * export default defineConfig({
 *   integrations: [
 *     notro({
 *       shikiConfig: { theme: 'github-dark' },
 *       hastPlugins: [satteriMermaidPlugin({ theme: 'github-dark' })],
 *     }),
 *   ],
 * });
 * ```
 */

import type { AstroIntegration } from 'astro';
import type { MdastPluginDefinition, HastPluginDefinition } from 'satteri';
import mdx from '@astrojs/mdx';
import { satteri } from '@astrojs/markdown-satteri';
import { buildSatteriMdastPlugins } from './utils/satteri-plugins.ts';

/**
 * Options for the notro() Astro integration.
 */
export interface NotroOptions {
	/**
	 * Sätteri MDASTP plugins for static `.mdx` files.
	 * These do NOT apply to runtime Notion content — Notion markdown is
	 * preprocessed at string level by preprocessNotionMarkdown().
	 *
	 * @example [myMdastPlugin]
	 */
	mdastPlugins?: MdastPluginDefinition[];

	/**
	 * Sätteri HAST plugins for static `.mdx` files.
	 * These do NOT apply to runtime Notion content.
	 *
	 * @example [satteriMermaidPlugin({ theme: 'github-dark' })]
	 */
	hastPlugins?: HastPluginDefinition[];

	/**
	 * Shiki syntax highlighting configuration for static `.mdx` files.
	 * When provided, notro sets `markdown.shikiConfig` in the Astro config
	 * so the Sätteri MDX processor picks it up automatically.
	 *
	 * Alternatively, set `markdown.shikiConfig` directly in `defineConfig`.
	 *
	 * @example { theme: 'github-dark' }
	 * @example { themes: { light: 'github-light', dark: 'github-dark' } }
	 */
	shikiConfig?: Record<string, unknown>;

	/**
	 * Additional packages to add to Vite's ssr.external list.
	 * Use this when a HAST plugin dynamically imports a package that needs
	 * to be resolved by Node.js's native ESM loader instead of Vite's
	 * module runner (e.g. packages that use native binaries or dynamic imports).
	 *
	 * @example ['my-native-package']
	 */
	viteExternals?: string[];

	/**
	 * Whether to extend Astro's base markdown config (shikiConfig, syntaxHighlight).
	 * Defaults to `true` when `shikiConfig` is provided so it flows to the Sätteri
	 * MDX processor automatically. Set explicitly to control inheritance.
	 */
	extendMarkdownConfig?: boolean;
}

export function notro(options: NotroOptions = {}): AstroIntegration {
	const {
		mdastPlugins = [],
		hastPlugins = [],
		shikiConfig,
		extendMarkdownConfig,
		viteExternals = [],
	} = options;

	// extendMarkdownConfig defaults to true when shikiConfig is set so the
	// Sätteri MDX processor inherits it from markdown config automatically.
	// Otherwise defaults to false to avoid inheriting legacy markdown settings.
	const resolvedExtendMarkdownConfig = extendMarkdownConfig ?? (shikiConfig != null);

	return {
		name: 'notro',
		hooks: {
			'astro:config:setup': ({ updateConfig }) => {
				// Build the Sätteri processor with notro's core MDASTP plugins
				// (callout directive conversion) and any user-provided plugins.
				const satteriProcessor = satteri({
					// Enable :::callout{...} directive parsing
					features: { directive: true },
					mdastPlugins: [...buildSatteriMdastPlugins(), ...mdastPlugins],
					hastPlugins: [...hastPlugins],
				});

				// When shikiConfig is provided, propagate it to Astro's markdown config
				// so the Sätteri MDX processor can create a Shiki highlighter for it.
				// This relies on extendMarkdownConfig: true in the mdx() call below.
				if (shikiConfig != null) {
					updateConfig({
						markdown: {
							syntaxHighlight: 'shiki',
							shikiConfig,
						},
					});
				}

				// Inject @astrojs/mdx by appending to the integrations array via
				// updateConfig(). Astro's config setup loop re-checks the array length
				// each iteration, so the injected MDX integration is picked up and its
				// own astro:config:setup hook runs immediately after notro's hook.
				updateConfig({
					integrations: [mdx({
						processor: satteriProcessor,
						extendMarkdownConfig: resolvedExtendMarkdownConfig,
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
			},
		},
	};
}

// Default export so `astro add notro` generates `import notro from 'notro'`
// which resolves to this file (via the "default" export condition in package.json).
export default notro;
