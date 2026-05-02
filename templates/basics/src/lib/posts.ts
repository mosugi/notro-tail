import type { CollectionEntry } from "astro:content";

export function getSortedPosts(posts: CollectionEntry<"posts">[]) {
  return posts.slice().sort((a, b) => {
    const aDate = a.data.properties.Date?.date?.start ?? "";
    const bDate = b.data.properties.Date?.date?.start ?? "";
    return bDate.localeCompare(aDate);
  });
}
