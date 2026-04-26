/**
 * Component registry — maps all Notion block types to installed components.
 *
 * Usage:
 *   import { NotroContent } from 'notro-loader';
 *   import { notroComponents } from '@/components/notro';
 *
 *   <NotroContent markdown={md} {linkToPages} components={notroComponents} />
 *
 * To override a component for one-off use:
 *   components={{ ...notroComponents, callout: MyCallout }}
 */
import { makeHtmlElement } from 'notro-loader';

// Site-customized components (differ from notro-ui defaults)
import Callout          from './Callout.astro';   // rounded-md (vs rounded-lg default)
import ColoredParagraph from './ColoredParagraph.astro';
import H1              from './H1.astro';         // mt-8 (vs mt-10 default)
import H2              from './H2.astro';         // mt-6 (vs mt-8 default)
import Quote           from './Quote.astro';      // blue left border, muted text

// Default notro-ui components (unmodified)
import Toggle          from './Toggle.astro';
import ToggleTitle     from './ToggleTitle.astro';
import Columns         from './Columns.astro';
import Column          from './Column.astro';
import Audio           from './Audio.astro';
import Video           from './Video.astro';
import FileBlock       from './FileBlock.astro';
import PdfBlock        from './PdfBlock.astro';
import PageRef         from './PageRef.astro';
import DatabaseRef     from './DatabaseRef.astro';
import TableOfContents from './TableOfContents.astro';
import EmptyBlock      from './EmptyBlock.astro';
import Mention         from './Mention.astro';
import MentionDate     from './MentionDate.astro';
import H3              from './H3.astro';
import H4              from './H4.astro';
import StyledSpan      from './StyledSpan.astro';
import ImageBlock      from './ImageBlock.astro';
import TableBlock       from './TableBlock.astro';
import TableHead        from './TableHead.astro';
import TableBody        from './TableBody.astro';
import TableColgroup    from './TableColgroup.astro';
import TableCol         from './TableCol.astro';
import TableRow         from './TableRow.astro';
import TableHeaderCell  from './TableHeaderCell.astro';
import TableCell        from './TableCell.astro';

export const notroComponents = {
  // ── Notion block elements (PascalCase) ────────────────────────────────
  // Must use PascalCase keys — see defaultComponents for explanation.
  // callout is lowercase because it comes from a remark plugin, not raw HTML.
  callout:              Callout,
  TableOfContents:      TableOfContents,
  Video:                Video,
  Audio:                Audio,
  FileBlock:            FileBlock,
  PdfBlock:             PdfBlock,
  Columns:              Columns,
  Column:               Column,
  PageRef:              PageRef,
  DatabaseRef:          DatabaseRef,
  Details:              Toggle,
  Summary:              ToggleTitle,
  EmptyBlock:           EmptyBlock,

  // ── Inline mentions (PascalCase) ───────────────────────────────────────
  MentionUser:          Mention,
  MentionPage:          Mention,
  MentionDatabase:      Mention,
  MentionDataSource:    Mention,
  MentionAgent:         Mention,
  MentionDate:          MentionDate,

  // ── Notion raw HTML table elements (PascalCase — renamed by rehypeBlockElementsPlugin) ──
  // These keys handle Notion's raw HTML tables (<table header-row="true">...).
  // rehypeBlockElementsPlugin renames the mdxJsxFlowElement nodes to PascalCase,
  // so only PascalCase keys are consulted for Notion raw HTML content.
  TableBlock:       TableBlock,
  TableHead:        TableHead,
  TableBody:        TableBody,
  TableColgroup:    TableColgroup,
  TableCol:         TableCol,
  TableRow:         TableRow,
  TableHeaderCell:  TableHeaderCell,
  TableCell:        TableCell,

  // ── HTML element overrides ─────────────────────────────────────────────
  // These lowercase keys handle HTML elements generated from markdown syntax
  // (e.g. GFM pipe tables produce <table>, <thead>, <tbody>, <tr>, <th>, <td>).
  h1: H1,
  h2: H2,
  h3: H3,
  h4: H4,
  blockquote: Quote,
  span:       StyledSpan,
  img:        ImageBlock,
  table:      TableBlock,
  thead:      TableHead,
  tbody:      TableBody,
  tr:         TableRow,
  th:         TableHeaderCell,
  td:         TableCell,

  // ── Standard HTML elements ─────────────────────────────────────────────
  p:      ColoredParagraph,
  ul:     makeHtmlElement('ul',     'mb-4 list-disc pl-6 space-y-1'),
  ol:     makeHtmlElement('ol',     'mb-4 list-decimal pl-6 space-y-1'),
  li:     makeHtmlElement('li',     'leading-7'),
  pre:    makeHtmlElement('pre'),
  hr:     makeHtmlElement('hr',     'my-8 border-t border-[var(--notro-border)]'),
  a:      makeHtmlElement('a',      'underline underline-offset-2 hover:opacity-70'),
  strong: makeHtmlElement('strong', 'font-semibold'),
  em:     makeHtmlElement('em',     'italic'),
  del:    makeHtmlElement('del',    'line-through'),
} as const;
