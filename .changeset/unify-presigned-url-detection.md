---
"notro-loader": patch
---

Add `isNotionPresignedUrl()` helper and unify S3 presigned URL detection

- Export `isNotionPresignedUrl(url)` as a single source of truth for detecting Notion S3 presigned URLs (covers `X-Amz-Algorithm` query param and `prod-files-secure.s3` hostname)
- Use it in `isPresignedUrlExpired`'s fallback path, replacing the previous overly-broad hostname check
- Fix `isPresignedUrlExpiredInMarkdown` to check **all** presigned URLs in markdown (was only checking the first), so articles with multiple images are correctly invalidated when any URL expires
- Align URL extraction regex in `isPresignedUrlExpiredInMarkdown` with `markdownHasPresignedUrls` for consistency
