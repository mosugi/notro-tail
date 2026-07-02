/**
 * Astro integration for notro.
 *
 * Injects `@astrojs/mdx` configured with notro's Sätteri plugin suite, which:
 * 1. Registers the `astro:jsx` renderer — required for Sätteri's `evaluate()`
 *    to work in Astro's SSG prerender pipeline.
 * 2. Configures any `.mdx` files in the project with the same Sätteri
 *    plugins used by notro's runtime MDX compilation (see satteri-pipeline.ts).
 *
 * notro is built entirely on Sätteri, Astro 7's Rust-based Markdown/MDX
 * processor. Extensibility uses Sätteri's mdast/hast plugin API instead of
 * remark/rehype plugins (which Astro 7 deprecated and Sätteri cannot run).
 *
 * Usage in astro.config.mjs:
 * ```js
 * import { notro } from 'notro-loader/integration';
 * import { satteriMermaid } from 'satteri-beautiful-mermaid';
 *
 * export default defineConfig({
 *   integrations: [
 *     notro({
 *       shikiConfig: { theme: 'github-dark' },
 *       features: { math: true },
 *       hastPlugins: [satteriMermaid({ theme: 'github-dark' })],
 *     }),
 *   ],
 * });
 * ```
 *
 * When no options are provided, notro only applies its Notion-core plugins
 * (callout conversion, color classes, component renames, heading slugs, TOC,
 * page links). Rich rendering features like math, syntax highlighting, and
 * diagrams are opt-in via the options above.
 */

import type { AstroIntegration } from "astro";
import mdx from "@astrojs/mdx";
import { satteri } from "@astrojs/markdown-satteri";
import type {
  Features,
  MdastPluginInput,
  HastPluginInput,
  MdastPluginDefinition,
  HastPluginDefinition,
} from "satteri";
import { setNotroSatteriConfig } from "./utils/notro-config.ts";
import { buildStaticSatteriPlugins } from "./utils/satteri-pipeline.ts";
import {
  createSatteriShikiPlugin,
  type CodeToHastFn,
} from "./utils/satteri-shiki.ts";

/**
 * Options for the notro() Astro integration.
 */
export interface NotroOptions {
  /**
   * Sätteri mdast plugins to add after notro's core Notion plugins.
   * Applied to both the runtime Notion content path and static .mdx files.
   * See https://satteri.bruits.org/docs/plugins/ for the plugin API.
   *
   * @example [satteriKatex()]  // render math nodes with KaTeX
   */
  mdastPlugins?: MdastPluginInput[];

  /**
   * Sätteri hast plugins to add after notro's core Notion plugins
   * (and before heading slugs / TOC / page-link resolution).
   * Applied to both the runtime Notion content path and static .mdx files.
   *
   * @example [satteriMermaid({ theme: 'github-dark' })]
   */
  hastPlugins?: HastPluginInput[];

  /**
   * Extra Sätteri parser features merged over notro's defaults
   * (directive: true, gfm: { footnotes: false }).
   *
   * @example { math: true }  // enable $...$ and $$...$$ parsing
   */
  features?: Features;

  /**
   * Shiki syntax highlighting configuration.
   * When provided, a Shiki hast plugin is automatically injected as the last
   * user plugin so that other plugins (e.g. satteriMermaid) run first.
   *
   * Requires shiki to be installed (optional dependency):
   *   npm install shiki
   *
   * @example { theme: 'github-dark' }
   * @example { themes: { light: 'github-light', dark: 'github-dark' } }
   */
  shikiConfig?: Record<string, unknown>;

  /**
   * Additional packages to add to Vite's ssr.external list.
   * Use this when a Sätteri plugin dynamically imports a package that
   * needs to be resolved by Node.js's native ESM loader instead of Vite's
   * module runner (e.g. packages that use native binaries or dynamic imports).
   *
   * @example ['my-native-package']
   */
  viteExternals?: string[];

  /**
   * Whether to extend Astro's base markdown config.
   * Same as @astrojs/mdx's extendMarkdownConfig option.
   * Defaults to false to avoid duplicate plugin registration.
   */
  extendMarkdownConfig?: boolean;
}

export function notro(options: NotroOptions = {}): AstroIntegration {
  const {
    mdastPlugins = [],
    hastPlugins = [],
    features = {},
    shikiConfig,
    extendMarkdownConfig = false,
    viteExternals = [],
  } = options;

  return {
    name: "notro",
    hooks: {
      "astro:config:setup": async ({ updateConfig }) => {
        // When shikiConfig is provided, dynamically load shiki (optional
        // dependency) and inject its plugin as the last user hast plugin so
        // that diagram plugins (satteriMermaid) run first.
        let allHastPlugins: HastPluginInput[] = hastPlugins;
        if (shikiConfig != null) {
          try {
            // Use new Function to escape Vite's static import analysis.
            // A plain `await import('shiki')` inside an Astro hook is
            // intercepted by Vite's module runner, which may fail to resolve
            // optional packages. new Function forces Node.js's native ESM
            // loader to handle the import at runtime.
            // eslint-disable-next-line @typescript-eslint/no-implied-eval
            const nativeImport = new Function("s", "return import(s)") as (
              s: string,
            ) => Promise<{ codeToHast: CodeToHastFn }>;
            const mod = await nativeImport("shiki");
            allHastPlugins = [
              ...hastPlugins,
              createSatteriShikiPlugin(mod.codeToHast, shikiConfig),
            ];
          } catch {
            throw new Error(
              "[notro] shikiConfig was provided but shiki is not installed.\n" +
                "Run: npm install shiki",
            );
          }
        }

        // Share user-provided plugins with the runtime compileMdxCached()
        // path via the module-level config store in notro-config.ts.
        // Both the static .mdx path (via @astrojs/mdx below) and the runtime
        // Notion content path (via buildSatteriPlugins) use the same
        // plugin configuration.
        setNotroSatteriConfig({
          mdastPlugins,
          hastPlugins: allHastPlugins,
          features,
        });

        // Static .mdx files use the same Sätteri plugin bundle as the
        // runtime Notion path (minus page-link resolution, which needs the
        // loader's linkToPages map). Only overrides MDX — plain `.md` files
        // keep the project's `markdown.processor` setting.
        const staticSatteri = buildStaticSatteriPlugins();

        // Inject @astrojs/mdx by appending to the integrations array via
        // updateConfig(). Astro's config setup loop re-checks the array
        // length each iteration, so the injected MDX integration is picked
        // up and its own astro:config:setup hook runs immediately after
        // notro's hook.
        updateConfig({
          integrations: [
            mdx({
              processor: satteri({
                features: staticSatteri.features,
                // satteri()'s option types accept plugin definitions only,
                // but the underlying compile calls also resolve plugin
                // factories (needed for per-document state like the slug
                // counter), so widen here.
                mdastPlugins:
                  staticSatteri.mdastPlugins as MdastPluginDefinition[],
                hastPlugins:
                  staticSatteri.hastPlugins as HastPluginDefinition[],
              }),
              extendMarkdownConfig,
              // `as any` is needed because Astro's TypeScript types for
              // updateConfig only accept AstroIntegration[], but @astrojs/mdx
              // returns its own subtype that is structurally compatible but
              // not assignable.
            }),
          ] as any, // eslint-disable-line @typescript-eslint/no-explicit-any

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
