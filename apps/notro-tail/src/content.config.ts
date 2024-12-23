import { defineCollection } from "astro:content";
import { loader } from "notro/src/loader/loader.ts";
import { LogLevel } from "@notionhq/client";

const database = defineCollection({
  loader: loader({
    auth: import.meta.env.NOTION_TOKEN,
    logLevel: LogLevel.DEBUG,
  }),
});

export const collections = { database };
