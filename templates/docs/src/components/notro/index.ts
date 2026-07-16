/**
 * Component registry — maps all Notion block types to your installed components.
 *
 * Pass this to NotroContent via the components prop:
 *
 *   import { NotroContent } from 'notro-loader';
 *   import { notroComponents } from '@/components/notro';
 *
 *   <NotroContent markdown={md} {linkToPages} components={notroComponents} />
 *
 * To override individual components, spread this object:
 *
 *   components={{ ...notroComponents, Callout: MyCallout }}
 *
 * Note: standard HTML elements (ul, ol, li, a, strong, em, pre, hr, etc.)
 * are intentionally NOT overridden — Starlight's .sl-markdown-content CSS handles them.
 */
import Callout              from './Callout.astro';
import ColoredParagraph     from './ColoredParagraph.astro';
import Toggle               from './Toggle.astro';
import ToggleTitle          from './ToggleTitle.astro';
import Columns              from './Columns.astro';
import Column               from './Column.astro';
import Audio                from './Audio.astro';
import Video                from './Video.astro';
import FileBlock            from './FileBlock.astro';
import PdfBlock             from './PdfBlock.astro';
import PageRef              from './PageRef.astro';
import DatabaseRef          from './DatabaseRef.astro';
import TableOfContents      from './TableOfContents.astro';
import EmptyBlock           from './EmptyBlock.astro';
import Mention              from './Mention.astro';
import MentionDate          from './MentionDate.astro';
import H1                   from './H1.astro';
import H2                   from './H2.astro';
import H3                   from './H3.astro';
import H4                   from './H4.astro';
import Quote                from './Quote.astro';
import StyledSpan           from './StyledSpan.astro';
import ImageBlock           from './ImageBlock.astro';
import TableBlock           from './TableBlock.astro';
import TableColgroup        from './TableColgroup.astro';
import TableCol             from './TableCol.astro';
import TableRow             from './TableRow.astro';
import TableCell            from './TableCell.astro';

export const notroComponents = {
  // ── Notion-specific blocks ─────────────────────────────────────────────
  Callout:               Callout,
  details:               Toggle,
  summary:               ToggleTitle,
  columns:               Columns,
  column:                Column,
  audio:                 Audio,
  video:                 Video,
  file:                  FileBlock,
  pdf:                   PdfBlock,
  page:                  PageRef,
  database:              DatabaseRef,
  table_of_contents:     TableOfContents,
  'empty-block':         EmptyBlock,

  // ── Inline mentions ────────────────────────────────────────────────────
  'mention-user':        Mention,
  'mention-page':        Mention,
  'mention-database':    Mention,
  'mention-data-source': Mention,
  'mention-agent':       Mention,
  'mention-date':        MentionDate,

  // ── HTML element overrides (color support + Notion-specific behavior) ───
  h1:         H1,
  h2:         H2,
  h3:         H3,
  h4:         H4,
  blockquote: Quote,
  span:       StyledSpan,
  img:        ImageBlock,
  table:      TableBlock,
  colgroup:   TableColgroup,
  col:        TableCol,
  tr:         TableRow,
  td:         TableCell,
  p:          ColoredParagraph,
} as const;
