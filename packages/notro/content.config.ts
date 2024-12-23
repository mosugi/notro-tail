import { defineCollection } from "astro:content";
import { loader } from "notro";

const database = defineCollection({
  loader: loader({
    auth: import.meta.env.NOTION_TOKEN,
    // database_id: import.meta.env.NOTION_ID,
    // Use Notion sorting and filtering
    // filter: {
    //   property: "Public",
    //   checkbox: { equals: true },
    // },
  }),
});

export const collections = { database };
