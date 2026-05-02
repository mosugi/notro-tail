import rss from "@astrojs/rss";
import type { APIContext } from "astro";
import { getCollection } from "astro:content";
import { getPlainText, hasTag } from "notro-loader/utils";
import config from "../config";

export async function GET(context: APIContext) {
  const posts = await getCollection("posts");

  // Exclude fixed pages; sort by date descending
  const blogPosts = posts
    .filter((entry) => !hasTag(entry.data.properties.Tags, "page"))
    .sort((a, b) => {
      const dateA = a.data.properties.Date.date?.start ?? "";
      const dateB = b.data.properties.Date.date?.start ?? "";
      return dateB.localeCompare(dateA);
    });

  return rss({
    title: config.site.name,
    description: config.site.description,
    site: context.site ?? context.url.origin,
    items: blogPosts.map((entry) => {
      const slug = getPlainText(entry.data.properties.Slug) || entry.id;
      const title = getPlainText(entry.data.properties.Name) ?? entry.id;
      const description = getPlainText(entry.data.properties.Description);
      const pubDate = entry.data.properties.Date.date?.start
        ? new Date(entry.data.properties.Date.date.start)
        : undefined;

      return {
        title,
        description: description || undefined,
        pubDate,
        link: `/blog/${slug}/`,
      };
    }),
  });
}
