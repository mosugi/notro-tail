/**
 * Module-level configuration store for notro's MDX plugin pipeline.
 *
 * The notro() Astro integration stores the user-provided remark/rehype plugins
 * here during astro:config:setup. buildMdxPlugins() reads them at render time
 * so that both the runtime Notion path (compileMdxCached) and the static .mdx
 * path (@astrojs/mdx) use the same plugin configuration.
 *
 * NOTE: We use globalThis instead of module-level variables so the state
 * persists across Vite module instances. Astro's integration hooks run in a
 * plain Node.js module context; at build/prerender time, Vite creates new
 * module instances for the same files. globalThis is the same object in both
 * contexts within the same Node.js process, so storing plugins there bridges
 * the two contexts without requiring a virtual module or serialisation.
 */
import type { PluggableList } from "unified";

/**
 * Which Markdown/MDX processor compiles Notion content at runtime.
 * - 'satteri': Astro 7's Rust-based processor (fast; no remark/rehype support)
 * - 'unified': the remark/rehype pipeline (required for user plugins)
 */
export type NotroProcessor = "satteri" | "unified";

declare global {
  // eslint-disable-next-line no-var
  var __notro_remarkPlugins: PluggableList | undefined;
  // eslint-disable-next-line no-var
  var __notro_rehypePlugins: PluggableList | undefined;
  // eslint-disable-next-line no-var
  var __notro_processor: NotroProcessor | undefined;
}

export function setNotroPlugins(
  remarkPlugins: PluggableList,
  rehypePlugins: PluggableList,
): void {
  globalThis.__notro_remarkPlugins = remarkPlugins;
  globalThis.__notro_rehypePlugins = rehypePlugins;
}

export function getNotroPlugins(): {
  remarkPlugins: PluggableList;
  rehypePlugins: PluggableList;
} {
  return {
    remarkPlugins: globalThis.__notro_remarkPlugins ?? [],
    rehypePlugins: globalThis.__notro_rehypePlugins ?? [],
  };
}

export function setNotroProcessor(processor: NotroProcessor): void {
  globalThis.__notro_processor = processor;
}

/**
 * The processor used for runtime Notion content compilation.
 * Defaults to 'satteri' when the notro() integration has not stored a choice
 * (i.e. no user remark/rehype plugins are configured).
 */
export function getNotroProcessor(): NotroProcessor {
  return globalThis.__notro_processor ?? "satteri";
}
