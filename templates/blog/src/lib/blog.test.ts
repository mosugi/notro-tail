import { describe, it, expect } from "vitest";
import {
  getSortedBlogPosts,
  buildSlugMap,
  toNavEntry,
  getAdjacentPosts,
  getPublicTags,
  getPinnedPosts,
  getBeginnerPosts,
  getAllPublicTags,
} from "./blog.ts";

// Minimal CollectionEntry mock — only the fields blog.ts accesses.
function makeEntry(opts: {
  id: string;
  slug?: string;
  name?: string;
  tags?: string[];
  date?: string;
  lang?: string;
}) {
  const tagOptions = (opts.tags ?? []).map((name) => ({ id: name, name, color: "default" }));
  return {
    id: opts.id,
    data: {
      markdown: "",
      truncated: false,
      unknown_block_ids: [],
      properties: {
        Slug: { type: "rich_text", rich_text: opts.slug ? [{ plain_text: opts.slug }] : [] },
        Name: { type: "title", title: opts.name ? [{ plain_text: opts.name }] : [] },
        Tags: { type: "multi_select", multi_select: tagOptions },
        Date: { type: "date", date: opts.date ? { start: opts.date } : null },
        Lang: { type: "select", select: opts.lang ? { id: opts.lang, name: opts.lang, color: "default" } : null },
      },
    },
  } as any;
}

const INTERNAL_TAGS = ["page", "pinned"];

// ─────────────────────────────────────────────
// getSortedBlogPosts
// ─────────────────────────────────────────────
describe("getSortedBlogPosts", () => {
  it("excludes posts tagged 'page'", () => {
    const posts = [
      makeEntry({ id: "a", tags: ["page"], date: "2024-01-01" }),
      makeEntry({ id: "b", date: "2024-01-02" }),
    ];
    const result = getSortedBlogPosts(posts);
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe("b");
  });

  it("sorts newest first", () => {
    const posts = [
      makeEntry({ id: "old", date: "2023-01-01" }),
      makeEntry({ id: "new", date: "2024-06-01" }),
      makeEntry({ id: "mid", date: "2023-12-01" }),
    ];
    const ids = getSortedBlogPosts(posts).map((p) => p.id);
    expect(ids).toEqual(["new", "mid", "old"]);
  });

  it("treats missing date as empty string (sorts last)", () => {
    const posts = [
      makeEntry({ id: "nodagte" }),
      makeEntry({ id: "dated", date: "2024-01-01" }),
    ];
    const ids = getSortedBlogPosts(posts).map((p) => p.id);
    expect(ids[0]).toBe("dated");
  });
});

// ─────────────────────────────────────────────
// buildSlugMap
// ─────────────────────────────────────────────
describe("buildSlugMap", () => {
  it("assigns each entry its raw slug when no duplicates", () => {
    const posts = [
      makeEntry({ id: "a", slug: "alpha" }),
      makeEntry({ id: "b", slug: "beta" }),
    ];
    const map = buildSlugMap(posts);
    expect(map.get("a")).toBe("alpha");
    expect(map.get("b")).toBe("beta");
  });

  it("falls back to entry.id when Slug is empty", () => {
    const posts = [makeEntry({ id: "no-slug" })];
    const map = buildSlugMap(posts);
    expect(map.get("no-slug")).toBe("no-slug");
  });

  it("appends -2, -3 for duplicate slugs in order", () => {
    const posts = [
      makeEntry({ id: "first", slug: "same" }),
      makeEntry({ id: "second", slug: "same" }),
      makeEntry({ id: "third", slug: "same" }),
    ];
    const map = buildSlugMap(posts);
    expect(map.get("first")).toBe("same");
    expect(map.get("second")).toBe("same-2");
    expect(map.get("third")).toBe("same-3");
  });

  it("deduplicates independently for each unique base slug", () => {
    const posts = [
      makeEntry({ id: "a1", slug: "a" }),
      makeEntry({ id: "b1", slug: "b" }),
      makeEntry({ id: "a2", slug: "a" }),
      makeEntry({ id: "b2", slug: "b" }),
    ];
    const map = buildSlugMap(posts);
    expect(map.get("a1")).toBe("a");
    expect(map.get("b1")).toBe("b");
    expect(map.get("a2")).toBe("a-2");
    expect(map.get("b2")).toBe("b-2");
  });

  it("prepends lang prefix for non-en articles", () => {
    const posts = [
      makeEntry({ id: "en", slug: "hello-notro", lang: "en" }),
      makeEntry({ id: "ja", slug: "hello-notro", lang: "ja" }),
      makeEntry({ id: "zh", slug: "hello-notro", lang: "zh-cn" }),
    ];
    const map = buildSlugMap(posts);
    expect(map.get("en")).toBe("hello-notro");
    expect(map.get("ja")).toBe("ja/hello-notro");
    expect(map.get("zh")).toBe("zh-cn/hello-notro");
  });

  it("treats null or undefined lang as en (no prefix)", () => {
    const posts = [makeEntry({ id: "a", slug: "foo" })];
    const map = buildSlugMap(posts);
    expect(map.get("a")).toBe("foo");
  });
});

// ─────────────────────────────────────────────
// toNavEntry
// ─────────────────────────────────────────────
describe("toNavEntry", () => {
  it("uses Slug property when present", () => {
    const entry = makeEntry({ id: "abc", slug: "my-slug", name: "My Post" });
    expect(toNavEntry(entry)).toEqual({ slug: "my-slug", title: "My Post" });
  });

  it("falls back to entry.id when Slug is empty", () => {
    const entry = makeEntry({ id: "fallback-id", name: "Fallback" });
    expect(toNavEntry(entry)).toEqual({ slug: "fallback-id", title: "Fallback" });
  });

  it("falls back to entry.id when Name is empty", () => {
    const entry = makeEntry({ id: "id-only", slug: "s" });
    expect(toNavEntry(entry)).toEqual({ slug: "s", title: "id-only" });
  });

  it("uses slugMap value when provided", () => {
    const entry = makeEntry({ id: "p1", slug: "original", name: "Post" });
    const slugMap = new Map([["p1", "original-2"]]);
    expect(toNavEntry(entry, slugMap)).toEqual({ slug: "original-2", title: "Post" });
  });
});

// ─────────────────────────────────────────────
// getAdjacentPosts
// ─────────────────────────────────────────────
describe("getAdjacentPosts", () => {
  const posts = [
    makeEntry({ id: "newest", slug: "newest" }),
    makeEntry({ id: "middle", slug: "middle" }),
    makeEntry({ id: "oldest", slug: "oldest" }),
  ];

  it("returns prevNav (newer) and nextNav (older) for middle item", () => {
    const { prevNav, nextNav } = getAdjacentPosts(posts, "middle");
    expect(prevNav?.slug).toBe("newest");
    expect(nextNav?.slug).toBe("oldest");
  });

  it("returns undefined prevNav for the first (newest) item", () => {
    const { prevNav, nextNav } = getAdjacentPosts(posts, "newest");
    expect(prevNav).toBeUndefined();
    expect(nextNav?.slug).toBe("middle");
  });

  it("returns undefined nextNav for the last (oldest) item", () => {
    const { prevNav, nextNav } = getAdjacentPosts(posts, "oldest");
    expect(prevNav?.slug).toBe("middle");
    expect(nextNav).toBeUndefined();
  });

  it("returns both undefined when id is not found", () => {
    const { prevNav, nextNav } = getAdjacentPosts(posts, "nonexistent");
    expect(prevNav).toBeUndefined();
    expect(nextNav).toBeUndefined();
  });

  it("uses slugMap values for adjacent post slugs", () => {
    const slugMap = new Map([
      ["newest", "newest-2"],
      ["middle", "middle"],
      ["oldest", "oldest"],
    ]);
    const { prevNav } = getAdjacentPosts(posts, "middle", slugMap);
    expect(prevNav?.slug).toBe("newest-2");
  });
});

// ─────────────────────────────────────────────
// getPublicTags
// ─────────────────────────────────────────────
describe("getPublicTags", () => {
  it("filters out internal tags", () => {
    const tagsProp = {
      id: "prop-1",
      type: "multi_select" as const,
      multi_select: [
        { id: "1", name: "Astro", color: "blue" as const },
        { id: "2", name: "page", color: "default" as const },
        { id: "3", name: "pinned", color: "default" as const },
      ],
    };
    const result = getPublicTags(tagsProp, INTERNAL_TAGS);
    expect(result).toHaveLength(1);
    expect(result[0].name).toBe("Astro");
  });

  it("returns empty array for undefined property", () => {
    expect(getPublicTags(undefined, INTERNAL_TAGS)).toEqual([]);
  });

  it("returns all tags when none are internal", () => {
    const tagsProp = {
      id: "prop-2",
      type: "multi_select" as const,
      multi_select: [
        { id: "1", name: "Astro", color: "blue" as const },
        { id: "2", name: "Notion", color: "green" as const },
      ],
    };
    expect(getPublicTags(tagsProp, INTERNAL_TAGS)).toHaveLength(2);
  });
});

// ─────────────────────────────────────────────
// getPinnedPosts
// ─────────────────────────────────────────────
describe("getPinnedPosts", () => {
  it("returns only pinned posts", () => {
    const posts = [
      makeEntry({ id: "a", tags: ["pinned"] }),
      makeEntry({ id: "b", tags: ["Astro"] }),
      makeEntry({ id: "c", tags: ["pinned", "Notion"] }),
    ];
    const result = getPinnedPosts(posts);
    expect(result.map((p) => p.id)).toEqual(["a", "c"]);
  });

  it("returns empty array when no posts are pinned", () => {
    const posts = [makeEntry({ id: "a" }), makeEntry({ id: "b", tags: ["Astro"] })];
    expect(getPinnedPosts(posts)).toHaveLength(0);
  });
});

// ─────────────────────────────────────────────
// getBeginnerPosts
// ─────────────────────────────────────────────
describe("getBeginnerPosts", () => {
  it("returns posts tagged 入門 but not pinned", () => {
    const posts = [
      makeEntry({ id: "beginner", tags: ["入門"] }),
      makeEntry({ id: "pinned-beginner", tags: ["入門", "pinned"] }),
      makeEntry({ id: "other", tags: ["Astro"] }),
    ];
    const result = getBeginnerPosts(posts);
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe("beginner");
  });
});

// ─────────────────────────────────────────────
// getAllPublicTags
// ─────────────────────────────────────────────
describe("getAllPublicTags", () => {
  it("deduplicates tags across posts", () => {
    const posts = [
      makeEntry({ id: "a", tags: ["Astro", "Notion"] }),
      makeEntry({ id: "b", tags: ["Astro", "TypeScript"] }),
    ];
    const tags = getAllPublicTags(posts, INTERNAL_TAGS);
    expect(tags).toHaveLength(3);
    expect(tags).toContain("Astro");
    expect(tags).toContain("Notion");
    expect(tags).toContain("TypeScript");
  });

  it("excludes internal tags", () => {
    const posts = [
      makeEntry({ id: "a", tags: ["Astro", "page", "pinned"] }),
    ];
    const tags = getAllPublicTags(posts, INTERNAL_TAGS);
    expect(tags).toEqual(["Astro"]);
  });

  it("returns empty array for posts with no tags", () => {
    const posts = [makeEntry({ id: "a" }), makeEntry({ id: "b" })];
    expect(getAllPublicTags(posts, INTERNAL_TAGS)).toHaveLength(0);
  });
});
