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
  .transform((data) => ({
    ...data,
    // Starlight reads entry.data.title and entry.data.description
    title: getPlainText(data.properties.Name) ?? "Untitled",
    description: getPlainText(data.properties.Description) ?? undefined,
    // Starlight required fields with defaults matching StarlightFrontmatterSchema.
    // These must be present since we bypass docsSchema() and use a custom schema.
    draft: false,
    head: [] as [],
    template: "doc" as const,
    pagefind: true,
    editUrl: true as const,
    sidebar: { hidden: false, attrs: {} } as {
      hidden: boolean;
      order?: number;
      label?: string;
      attrs: Record<string, unknown>;
    },
  }));

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
