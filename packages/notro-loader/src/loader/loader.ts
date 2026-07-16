import type { Loader } from "astro/loaders";
import {
  Client,
  isFullPage,
  iteratePaginatedAPI,
  APIErrorCode,
  APIResponseError,
} from "@notionhq/client";
import type {
  QueryDataSourceParameters,
  PageObjectResponse,
} from "@notionhq/client";
import {
  type PageWithMarkdownType,
  pageWithMarkdownSchema,
} from "./schema.ts";
import { isNotionPresignedUrl, isPresignedUrlExpired, markdownHasPresignedUrls } from "../utils/notion-url.ts";

type LoaderOptions = {
  queryParameters: QueryDataSourceParameters;
  // Derive from Client constructor to avoid importing from internal paths
  clientOptions: ConstructorParameters<typeof Client>[0];
  /**
   * Optional function to generate a custom entry ID for each Notion page.
   * Defaults to the Notion page UUID (`page.id`).
   *
   * Use this when the entry ID must match a specific format — for example,
   * when using the Starlight docs integration, where sidebar slugs must
   * equal the collection entry ID:
   *
   * @example
   * generateId: (page) => {
   *   const slug = page.properties.Slug?.rich_text?.[0]?.plain_text;
   *   return slug ?? page.id;
   * }
   */
  generateId?: (page: PageObjectResponse) => string;
  /**
   * When true, sets a synthetic `filePath` on each store entry so that
   * Starlight's sidebar autogenerate can resolve route paths from the entry ID.
   * Only needed when using this loader with `@astrojs/starlight`.
   * @default false
   */
  useFilePath?: boolean;
};

// Notion file-type covers, icons, inline images, and file properties use
// pre-signed S3 URLs that expire after ~1 hour. If any of the stored URLs
// have actually expired, the entry must be re-fetched to get fresh URLs.
// We check expiry from the X-Amz-Date / X-Amz-Expires query parameters so
// that unchanged entries are not evicted on every build.
function hasExpiredNotionPresignedUrl(data: PageWithMarkdownType): boolean {
  if (data.cover?.type === "file" && isPresignedUrlExpired(data.cover.file.url))
    return true;
  if (data.icon?.type === "file" && isPresignedUrlExpired(data.icon.file.url))
    return true;
  // Check all `files` type properties (e.g. FeaturedImage) for file-type entries
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  for (const prop of Object.values(data.properties ?? {}) as any[]) {
    if (prop?.type !== "files") continue;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const files = prop.files as any[];
    if (files?.some((f: any) => f.type === "file" && isPresignedUrlExpired(f.file.url)))
      return true;
  }
  return markdownHasPresignedUrls(data.markdown)
    ? isPresignedUrlExpiredInMarkdown(data.markdown)
    : false;
}

// Extract all presigned S3 URLs from markdown and check if any have expired.
// Returns true as soon as any URL is found to be expired.
// Uses the same URL pattern as markdownHasPresignedUrls for consistency.
function isPresignedUrlExpiredInMarkdown(markdown: string): boolean {
  const matches = markdown.matchAll(/https?:\/\/[^\s)"']*[?&]X-Amz-Algorithm=[^\s)"']*/g);
  for (const [url] of matches) {
    if (isPresignedUrlExpired(url)) return true;
  }
  // Also check prod-files-secure.s3 URLs (may not have X-Amz-Algorithm in some cases)
  const s3Matches = markdown.matchAll(/https?:\/\/prod-files-secure\.s3[^\s)"']*/g);
  for (const [url] of s3Matches) {
    if (isNotionPresignedUrl(url) && isPresignedUrlExpired(url)) return true;
  }
  return false;
}

// Error codes that are safe to retry (rate limit, server errors).
const RETRYABLE_API_ERROR_CODES: ReadonlySet<string> = new Set([
  APIErrorCode.RateLimited,
  APIErrorCode.InternalServerError,
  APIErrorCode.ServiceUnavailable,
]);

// Retry delays in milliseconds for each attempt (exponential backoff: 1s, 2s, 4s).
const RETRY_DELAYS_MS = [1000, 2000, 4000];

/**
 * Generic retry wrapper for Notion API calls.
 * - 429 (RateLimited), 500 (InternalServerError), 503 (ServiceUnavailable): retry up to 3 times
 *   with exponential backoff (1s / 2s / 4s).
 * - Other errors (401, 403, 404, etc.): re-thrown immediately.
 *
 * @param fn - Async function to call (and retry on transient errors).
 * @param label - Human-readable label for warning messages (e.g. "Page <id>").
 * @param logger - Logger with a warn method.
 */
async function withRetry<T>(
  fn: () => Promise<T>,
  label: string,
  logger: { warn: (msg: string) => void },
): Promise<T> {
  let lastError: unknown;

  for (let attempt = 0; attempt <= RETRY_DELAYS_MS.length; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;

      const isRetryable =
        error instanceof APIResponseError &&
        RETRYABLE_API_ERROR_CODES.has(error.code);

      if (!isRetryable || attempt === RETRY_DELAYS_MS.length) {
        throw error;
      }

      const delayMs = RETRY_DELAYS_MS[attempt];
      logger.warn(
        `${label}: API error "${(error as APIResponseError).code}" (attempt ${attempt + 1}/${RETRY_DELAYS_MS.length + 1}), retrying in ${delayMs}ms...`,
      );
      await new Promise((resolve) => setTimeout(resolve, delayMs));
    }
  }

  // Unreachable, but required for TypeScript exhaustiveness.
  throw lastError;
}

/**
 * Calls iteratePaginatedAPI(client.dataSources.query, ...) with retry logic for transient errors.
 * - 429 (RateLimited), 500 (InternalServerError), 503 (ServiceUnavailable): retry up to 3 times
 *   with exponential backoff (1s / 2s / 4s).
 * - Other errors (401, 403, 404, etc.): re-thrown immediately.
 */
async function queryDataSourceWithRetry(
  client: Client,
  queryParameters: QueryDataSourceParameters,
  logger: { warn: (msg: string) => void },
): Promise<Awaited<ReturnType<typeof iteratePaginatedAPI<typeof client.dataSources.query>>>[]> {
  return withRetry(
    () => Array.fromAsync(iteratePaginatedAPI(client.dataSources.query, queryParameters)),
    "dataSources.query",
    logger,
  );
}

/**
 * Calls client.pages.retrieveMarkdown with retry logic for transient errors.
 * - 429 (RateLimited), 500 (InternalServerError), 503 (ServiceUnavailable): retry up to 3 times
 *   with exponential backoff (1s / 2s / 4s).
 * - Other errors: re-thrown immediately.
 */
async function retrieveMarkdownWithRetry(
  client: Client,
  pageId: string,
  logger: { warn: (msg: string) => void },
): Promise<Awaited<ReturnType<typeof client.pages.retrieveMarkdown>>> {
  return withRetry(
    () => client.pages.retrieveMarkdown({ page_id: pageId }),
    `Page ${pageId}`,
    logger,
  );
}

// Define any options that the loader needs
export function loader({
  queryParameters,
  clientOptions,
  generateId,
  useFilePath = false,
}: LoaderOptions): Loader {
  const client = new Client({ notionVersion: "2026-03-11", ...clientOptions });
  const getEntryId = generateId ?? ((page: PageObjectResponse) => page.id);

  // Return a loader object
  return {
    name: "notro-loader",
    load: async ({ store, parseData, logger, config, collection }): Promise<void> => {
      // When useFilePath is enabled, build the base path for synthetic filePaths.
      // This mirrors what Astro sets for file-backed entries and is required by
      // Starlight's sidebar autogenerate to resolve route paths from entry IDs.
      const collectionBasePath = useFilePath
        ? `${config.srcDir.pathname.replace(config.root.pathname, '')}content/${collection}`
        : null;
      // Load data and update the store.
      // Uses retry logic for transient API errors (rate limit, server errors).
      const pageOrDatabases = await queryDataSourceWithRetry(
        client,
        queryParameters,
        logger,
      );

      const pages = pageOrDatabases.filter((page) => isFullPage(page));

      // Build a lookup map for O(1) access when checking store entries.
      // Keyed by the entry ID (custom or UUID) to match the store's key format.
      const pageByEntryId = new Map(
        pages.map((page) => [getEntryId(page), page]),
      );

      // Delete entries that are removed, edited, or contain expired pre-signed URLs
      store.entries().forEach(([id, { digest, data }]) => {
        const page = pageByEntryId.get(id);
        const isDeleted = page === undefined;
        const isEdited = page !== undefined && digest !== page.last_edited_time;
        const hasExpiredUrls = hasExpiredNotionPresignedUrl(
          data as PageWithMarkdownType,
        );
        if (isDeleted || isEdited || hasExpiredUrls) {
          logger.info(`Deleting page ${id} from store`);
          store.delete(id);
        }
      });

      // Load new or updated pages, respecting Notion's 3 requests/second rate limit.
      // Pages are processed in batches of 3 with a 1-second pause between batches.
      const pagesToLoad = pages.filter((page) => !store.has(getEntryId(page)));
      const BATCH_SIZE = 3;

      for (let i = 0; i < pagesToLoad.length; i += BATCH_SIZE) {
        const batch = pagesToLoad.slice(i, i + BATCH_SIZE);

        await Promise.all(
          batch.map(async (page) => {
            logger.info(`Loading page ${page.id} into store`);

            let markdownResponse: Awaited<
              ReturnType<typeof client.pages.retrieveMarkdown>
            >;

            try {
              markdownResponse = await retrieveMarkdownWithRetry(
                client,
                page.id,
                logger,
              );
            } catch (error) {
              // Skip this page rather than aborting the entire build.
              if (error instanceof APIResponseError) {
                logger.warn(
                  `Page ${page.id}: failed to retrieve markdown (${error.code}, status ${error.status}). Skipping.`,
                );
              } else {
                logger.warn(
                  `Page ${page.id}: unexpected error while retrieving markdown: ${String(error)}. Skipping.`,
                );
              }
              return;
            }

            if (markdownResponse.truncated) {
              // The Notion pages.retrieveMarkdown API truncates content at ~20,000 blocks.
              // There is no cursor/pagination parameter to retrieve the remaining content.
              // The page will be loaded with the truncated content only.
              // To avoid truncation, split large Notion pages into smaller sub-pages.
              logger.warn(
                `Page ${page.id}: markdown content was truncated by the Notion API ` +
                  `(~20,000 block limit). No pagination is available for this endpoint. ` +
                  `Consider splitting this Notion page into smaller pages to avoid truncation.`,
              );
            }

            if (markdownResponse.unknown_block_ids.length > 0) {
              // unknown_block_ids contains IDs of blocks that could not be converted to
              // Markdown by the Notion API (e.g. unsupported or unrenderable block types).
              // These blocks are silently omitted from the markdown output.
              // There is no way to retrieve their content via this API endpoint.
              logger.warn(
                `Page ${page.id}: ${markdownResponse.unknown_block_ids.length} block(s) could not be rendered to Markdown by the Notion API and were omitted. ` +
                  `Block IDs: ${markdownResponse.unknown_block_ids.join(", ")}`,
              );
            }

            // Store raw markdown from the Notion API.
            // compileMdxForAstro() (compile-mdx.ts) runs
            // preprocessNotionMarkdown() before each compile, so
            // preprocessing does not need to happen here.
            const rawMarkdown = markdownResponse.markdown;

            const entryId = getEntryId(page);
            const data = await parseData<PageWithMarkdownType>({
              id: entryId,
              data: {
                parent: page.parent,
                properties: page.properties,
                icon: page.icon,
                cover: page.cover,
                created_by: page.created_by,
                last_edited_by: page.last_edited_by,
                object: page.object,
                id: page.id,
                created_time: page.created_time,
                last_edited_time: page.last_edited_time,
                archived: page.archived,
                in_trash: page.in_trash,
                url: page.url,
                public_url: page.public_url,
                markdown: rawMarkdown,
                truncated: markdownResponse.truncated,
              } as PageWithMarkdownType,
            });

            store.set({
              id: entryId,
              // digest is used by the loader to detect edits between builds.
              // We use last_edited_time as a stable, string-comparable digest.
              digest: page.last_edited_time,
              data: data,
              // body is the raw text exposed by Astro's Content Layer API for
              // full-text search integrations. It is separate from data.markdown
              // (which is also the raw markdown) because Astro's store.set()
              // requires body to be a top-level field distinct from the schema data.
              body: rawMarkdown,
              ...(collectionBasePath ? { filePath: `${collectionBasePath}/${entryId}.md` } : {}),
            });
          }),
        );

        // Wait 1 second between batches to stay within the 3 req/s rate limit
        if (i + BATCH_SIZE < pagesToLoad.length) {
          await new Promise((resolve) => setTimeout(resolve, 1000));
        }
      }
    },
    // It will be overridden by user-defined schema.
    schema: pageWithMarkdownSchema,
  };
}
