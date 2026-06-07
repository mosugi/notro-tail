/**
 * satteriMermaidPlugin — Sätteri HAST plugin that renders ```mermaid code blocks
 * to inline SVG at build time.
 *
 * This is the Sätteri-compatible equivalent of `rehypeMermaid` for projects
 * that use `@astrojs/mdx` with the Sätteri processor.
 *
 * Requires beautiful-mermaid (optional dependency):
 *   npm install beautiful-mermaid
 *
 * Usage in astro.config.mjs:
 *   import { satteriMermaidPlugin } from 'rehype-beautiful-mermaid/satteri';
 *   notro({
 *     hastPlugins: [satteriMermaidPlugin({ theme: 'github-dark' })],
 *   })
 */

import { defineHastPlugin } from 'satteri';
import type { HastPluginDefinition } from 'satteri';
import type { Element, ElementContent } from 'hast';
import { fromHtmlIsomorphic } from 'hast-util-from-html-isomorphic';

export interface SatteriMermaidOptions {
	/** beautiful-mermaid theme key (e.g. 'github-dark', 'default'). */
	theme?: string;
	/**
	 * CSS class name applied to the wrapper <div> around each rendered SVG.
	 * When omitted, a `data-mermaid` attribute is used instead so that styling
	 * can be applied via a `[data-mermaid]` selector in global CSS.
	 *
	 * @example 'mermaid-diagram'
	 */
	className?: string;
}

export function satteriMermaidPlugin(options: SatteriMermaidOptions = {}): HastPluginDefinition {
	return defineHastPlugin({
		name: 'rehype-beautiful-mermaid-satteri',
		element: {
			filter: ['pre'],
			async visit(node, ctx): Promise<Element | void> {
				// Only handle <pre><code class="language-mermaid">
				const codeEl = node.children[0];
				if (!codeEl || codeEl.type !== 'element') return;
				const code = codeEl as Element;
				if (code.tagName !== 'code') return;
				const cls = code.properties?.className;
				if (!Array.isArray(cls) || !cls.includes('language-mermaid')) return;

				// Extract mermaid source text from the pre block.
				const mermaidCode = ctx.textContent(node).trim();
				if (!mermaidCode) return;

				// Try to load beautiful-mermaid (optional — graceful fallback if absent).
				//
				// Use new Function('return import(s)') to escape Vite's module runner.
				// In Astro's SSG build, HAST plugins run during the prerender phase
				// (after Vite finishes bundling), when the Vite module runner has already
				// been closed. A plain `await import('beautiful-mermaid')` would fail
				// with "Vite module runner has been closed". By constructing the import
				// call inside a new Function, Vite cannot analyse or intercept it, so
				// at runtime Node.js resolves it through its own native ESM loader.
				let svg: string;
				try {
					// eslint-disable-next-line @typescript-eslint/no-implied-eval
					const nativeImport = new Function('s', 'return import(s)') as (s: string) => Promise<typeof import('beautiful-mermaid')>;
					const mod = await nativeImport('beautiful-mermaid');
					const theme = options.theme != null ? mod.THEMES[options.theme] : undefined;
					svg = mod.renderMermaidSVG(mermaidCode, theme);
				} catch {
					// beautiful-mermaid not installed or failed to load; leave unchanged.
					return;
				}

				// Parse the SVG string into proper hast nodes and wrap in a div.
				const svgNodes = fromHtmlIsomorphic(svg, { fragment: true }).children;
				return {
					type: 'element',
					tagName: 'div',
					properties: options.className
						? { className: [options.className] }
						: { 'data-mermaid': '' },
					children: svgNodes as ElementContent[],
				};
			},
		},
	});
}
