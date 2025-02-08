import { defineCollection } from "astro:content";
import { loader, pageObjectSchema } from "notro";
import { LogLevel } from "@notionhq/client";
import { z } from "zod";

const database = defineCollection({
  loader: loader({
    queryParameters: {
      database_id: import.meta.env.NOTION_ID,
      sorts: [
        {
          timestamp: "last_edited_time",
          direction: "descending",
        },
      ],
    },
    clientOptions: {
      auth: import.meta.env.NOTION_TOKEN,
      logLevel: LogLevel.DEBUG,
    },
  }),
  schema: pageObjectSchema.extend({
    properties: z.object({
      Page: z.any(),
      Description: z.any(),
      Slug: z.any(),
      Public: z.any(),
      Date: z.any(),
      Type: z.any(),
      Order: z.any(),
    }),
  }),
});

export const collections = { database };
