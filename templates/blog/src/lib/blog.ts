import type { CollectionEntry } from "astro:content";
// Use notro-loader/utils (no .astro component deps) for pure utility functions
import { getPlainText, getMultiSelect, hasTag } from "notro-loader/utils";
import type { PropertyPageObjectResponseType } from "notro-loader";

type PostEntry = CollectionEntry<"posts">;

/** Returns blog posts (no "page" tag), sorted newest first by Date property. */
export function getSortedBlogPosts(posts: PostEntry[]): PostEntry[] {
  return posts
    .filter((entry) => !hasTag(entry.data.properties.Tags, "page"))
    .sort((a, b) => {
      const dateA = a.data.properties.Date.date?.start ?? "";
      const dateB = b.data.properties.Date.date?.start ?? "";
      return dateB.localeCompare(dateA);
    });
}

/**
 * Builds a map from post entry ID to deduplicated slug.
 * When multiple posts share the same Slug value, later posts (by array order)
 * receive a numeric suffix (-2, -3, ...). Logs a warning for each duplicate found.
 */
export function buildSlugMap(posts: PostEntry[]): Map<string, string> {
  const slugCounts = new Map<string, number>();
  const result = new Map<string, string>();

  for (const entry of posts) {
    const cleanSlug = getPlainText(entry.data.properties.Slug) || entry.id;
    const lang = entry.data.properties.Lang?.select?.name;
    const rawSlug = lang && lang !== "en" ? `${lang}/${cleanSlug}` : cleanSlug;
    const count = slugCounts.get(rawSlug) ?? 0;
    slugCounts.set(rawSlug, count + 1);

    if (count > 0) {
      const deduped = `${rawSlug}-${count + 1}`;
      console.warn(
        `[notro] Duplicate slug "${rawSlug}" (page ${entry.id}). ` +
          `Using "${deduped}". Set a unique Slug in Notion to fix this.`,
      );
      result.set(entry.id, deduped);
    } else {
      result.set(entry.id, rawSlug);
    }
  }

  return result;
}

/** Converts a post entry to a minimal nav object { slug, title }. */
export function toNavEntry(
  entry: PostEntry,
  slugMap?: Map<string, string>,
): { slug: string; title: string } {
  return {
    slug: slugMap?.get(entry.id) ?? (getPlainText(entry.data.properties.Slug) || entry.id),
    title: getPlainText(entry.data.properties.Name) ?? entry.id,
  };
}

/**
 * Returns prev (newer) and next (older) nav entries for a post in a date-sorted list.
 * Assumes sortedPosts is sorted newest-first (descending).
 */
export function getAdjacentPosts(
  sortedPosts: PostEntry[],
  currentId: string,
  slugMap?: Map<string, string>,
): {
  prevNav: { slug: string; title: string } | undefined;
  nextNav: { slug: string; title: string } | undefined;
} {
  const idx = sortedPosts.findIndex((p) => p.id === currentId);
  return {
    prevNav: idx > 0 ? toNavEntry(sortedPosts[idx - 1]!, slugMap) : undefined,
    nextNav:
      idx >= 0 && idx < sortedPosts.length - 1
        ? toNavEntry(sortedPosts[idx + 1]!, slugMap)
        : undefined,
  };
}

/** Returns multi-select tags, excluding internal system tags. */
export function getPublicTags(
  tagsProperty: PropertyPageObjectResponseType | undefined,
  internalTags: string[],
): { id: string; name: string; color: string }[] {
  return getMultiSelect(tagsProperty).filter((t) => !internalTags.includes(t.name));
}

/** Returns posts tagged "pinned". */
export function getPinnedPosts(blogPosts: PostEntry[]): PostEntry[] {
  return blogPosts.filter((entry) => hasTag(entry.data.properties.Tags, "pinned"));
}

/** Returns posts tagged "入門" but not "pinned". */
export function getBeginnerPosts(blogPosts: PostEntry[]): PostEntry[] {
  return blogPosts.filter(
    (entry) =>
      hasTag(entry.data.properties.Tags, "入門") &&
      !hasTag(entry.data.properties.Tags, "pinned"),
  );
}

/** Returns all unique public tag names across a set of posts, excluding internal tags. */
export function getAllPublicTags(posts: PostEntry[], internalTags: string[]): string[] {
  return [
    ...new Set(
      posts.flatMap((entry) =>
        getMultiSelect(entry.data.properties.Tags)
          .map((t) => t.name)
          .filter((name) => !internalTags.includes(name)),
      ),
    ),
  ];
}
