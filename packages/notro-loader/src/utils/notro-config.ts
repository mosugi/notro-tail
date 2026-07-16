/**
 * Module-level configuration store for notro's Sätteri plugin pipeline.
 *
 * The notro() Astro integration stores the user-provided Sätteri plugins and
 * feature flags here during astro:config:setup. buildSatteriPlugins() reads
 * them at render time so that both the runtime Notion path (compileMdxCached)
 * and the static .mdx path (@astrojs/mdx) use the same plugin configuration.
 *
 * NOTE: We use globalThis instead of module-level variables so the state
 * persists across Vite module instances. Astro's integration hooks run in a
 * plain Node.js module context; at build/prerender time, Vite creates new
 * module instances for the same files. globalThis is the same object in both
 * contexts within the same Node.js process, so storing plugins there bridges
 * the two contexts without requiring a virtual module or serialisation.
 */
import type { Features, MdastPluginInput, HastPluginInput } from "satteri";

export interface NotroSatteriConfig {
  /** User-provided Sätteri mdast plugins (run after notro's core plugins). */
  mdastPlugins: MdastPluginInput[];
  /** User-provided Sätteri hast plugins (run after renames, before slugs/TOC). */
  hastPlugins: HastPluginInput[];
  /** Extra Sätteri parser features merged over notro's defaults. */
  features: Features;
}

declare global {
  // eslint-disable-next-line no-var
  var __notro_satteri_config: NotroSatteriConfig | undefined;
}

export function setNotroSatteriConfig(config: NotroSatteriConfig): void {
  globalThis.__notro_satteri_config = config;
}

export function getNotroSatteriConfig(): NotroSatteriConfig {
  return (
    globalThis.__notro_satteri_config ?? {
      mdastPlugins: [],
      hastPlugins: [],
      features: {},
    }
  );
}
