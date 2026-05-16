import { defineCollection } from "astro:content";
import { loader, notroProperties, pageWithMarkdownSchema } from "notro-loader";
import { z } from "zod";

const pagesCollection = defineCollection({
  loader: loader({
    queryParameters: {
      data_source_id: import.meta.env.NOTION_DATASOURCE_ID,
    },
    clientOptions: {
      auth: import.meta.env.NOTION_TOKEN,
    },
  }),
  schema: pageWithMarkdownSchema.extend({
    properties: z.object({
      Name: notroProperties.title,
      // Require at least one rich_text item so empty slugs are rejected at build time.
      Slug: notroProperties.richText.extend({
        rich_text: notroProperties.richText.shape.rich_text.min(1),
      }),
    }),
  }),
});

export const collections = {
  pages: pagesCollection,
};
