import { defineCollection } from "astro:content";
import { loader, pageWithMarkdownSchema, notroProperties } from "notro-loader";
import { getPlainText } from "notro-loader/utils";
import { z } from "zod";

const notroDocsSchema = pageWithMarkdownSchema
  .extend({
    properties: z.object({
      Name: notroProperties.title,
      Description: notroProperties.richText.optional(),
      Slug: notroProperties.richText,
      Public: notroProperties.checkbox,
    }),
  })
  // Make all Notion fields optional and allow extra fields to pass through so that
  // StarlightPage (which validates against this schema) can provide just title/template/hero
  // without Notion-specific fields.
  .partial()
  .passthrough()
  .transform((data) => {
    const p = data.properties;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const d = data as Record<string, any>;
    return {
      ...data,
      // Starlight reads entry.data.title and entry.data.description
      title: p ? (getPlainText(p.Name) ?? "Untitled") : String(d.title ?? ""),
      description: p ? (getPlainText(p.Description) ?? undefined) : (d.description as string | undefined),
      // Starlight required fields with defaults matching StarlightFrontmatterSchema.
      // These must be present since we bypass docsSchema() and use a custom schema.
      draft: false,
      head: (d.head as []) ?? ([] as []),
      template: (p ? "doc" : (d.template ?? "doc")) as "doc" | "splash",
      pagefind: p ? true : (d.pagefind as boolean ?? true),
      editUrl: true as const,
      // Pass through hero data from StarlightPage frontmatter (undefined for normal docs pages).
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      hero: d.hero as any,
      sidebar: p
        ? ({ hidden: false, attrs: {} } as {
            hidden: boolean;
            order?: number;
            label?: string;
            attrs: Record<string, unknown>;
          })
        : (d.sidebar ?? { hidden: false, attrs: {} }),
    };
  });

export const collections = {
  docs: defineCollection({
    loader: loader({
      queryParameters: {
        data_source_id: import.meta.env.NOTION_DATASOURCE_ID,
        filter: { property: "Public", checkbox: { equals: true } },
      },
      clientOptions: { auth: import.meta.env.NOTION_TOKEN },
      // Use the Slug property as the entry ID so Starlight's sidebar slugs match.
      // e.g. Slug = "getting-started/introduction" → entry ID = "getting-started/introduction"
      generateId: (page) => {
        const slugProp = page.properties.Slug;
        if (slugProp?.type === "rich_text" && slugProp.rich_text.length > 0) {
          const text = slugProp.rich_text.map((t) => t.plain_text).join("");
          if (text) return text;
        }
        return page.id;
      },
    }),
    schema: notroDocsSchema,
  }),
};
