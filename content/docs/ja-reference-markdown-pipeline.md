---
slug: ja/reference/markdown-pipeline
title: Markdown パイプライン
---

# Markdown パイプライン

このページでは、markdown 処理パイプラインのすべてのステップ — Notion API の raw 出力からレンダリング済み HTML まで — を説明します。

## 概要

```
Raw Notion markdown（pages.retrieveMarkdown）
  ↓  preprocessNotionMarkdown()   構造的な問題を修正
  ↓  remarkNfm                    ディレクティブ + GFM + コールアウト変換
  ↓  （ユーザー remarkPlugins）
  ↓  rehypeRaw                    HTML 文字列 → hast ノード
  ↓  rehypeNotionColor            color="gray" → notro-* クラス
  ↓  rehypeBlockElements          video → Video（PascalCase 変換）
  ↓  rehypeInlineMentions         mention-user → MentionUser
  ↓  （ユーザー rehypePlugins）
  ↓  rehypeShiki                  シンタックスハイライト
  ↓  rehypeSlug                   見出しに id 属性
  ↓  rehypeToc                    <TableOfContents> に目次を設定
  ↓  resolvePageLinks             notion.so → サイト相対 URL
  ↓  @mdx-js/mdx evaluate()
  ↓  <Content components={notionComponents} />
レンダリング済み HTML
```

---

## preprocessNotionMarkdown

`preprocessNotionMarkdown()` は AST パースの前に Notion の raw markdown 出力の構造的問題を修正する文字列プリプロセッサー（remark プラグインではない）です。`remarkNfm` によって自動的に呼び出されます。

### Fix 0 — エスケープされたインライン数式の移行

旧バージョンの notro はインライン数式を `\$…\$` にエスケープしていました。この修正はそれらを `$…$` に戻して互換性を確保します。

### Fix 1 — setext 見出しの誤認識

前の空行なしの `---` 区切り線が setext H2 の下線として誤認識されます。Fix 1 は bare `---` 区切り線の前に空行を挿入します。

**変換前:**
```md
Some text
---
Next section
```

**変換後:**
```md
Some text

---
Next section
```

### Fix 2 — コールアウトディレクティブの正規化

Notion は `"::: callout {…}"` としてコールアウトブロックをエクスポートします。Fix 2 はスペースを `":::callout{…}"` に正規化して `remark-directive` パーサーに対応し、コールアウトブロック内のタブインデントされたコンテンツをインデント解除します。

### Fix 3 — ブロックレベルのカラーアノテーション

段落と見出しの Notion カラーアノテーションはブロック末尾に `{color="gray_bg"}` としてエクスポートされます。Fix 3 はこれを raw HTML の `<p color="gray_bg">` に変換し、後で `rehypeNotionColor` が CSS クラスに変換します。

### Fix 4 — 目次タグ

`<table_of_contents/>`（アンダースコア付き）は CommonMark パーサーではブロックレベルの HTML 要素として認識されません。Fix 4 は `<div>` で囲んでブロックとして扱われるようにします。

### Fix 5 — インライン数式フォーマット

Notion はインライン数式を `$\`…\`$` としてエクスポートします。Fix 5 はこれを `remark-math` 用の `$…$` に変換します。

### Fix 6 — 同期ブロックラッパーの削除

`<synced_block>` ラッパーを削除し、内部のコンテンツをドキュメントレベルにインデント解除します。

### Fix 7 — 空ブロックの独立

`<empty-block/>` インライン要素を空行で囲み、remark がブロックレベル要素として扱うようにします（MDX コンポーネントルーティングに必要）。

### Fix 8 — 閉じタグへの空行追加

`</table>`、`</details>`、`</columns>`、`</column>`、`</summary>` に末尾の空行を追加します。これがないと CommonMark の HTML ブロック検出モードが後続のすべてのコンテンツを raw テキストとして飲み込み、remark が後続の markdown を解析できなくなります。

### Fix 9 — テーブルセル内の Markdown リンク

raw HTML の `<td>` セル内の `[text](url)` 構文は remark によって処理されません（`<table>` ブロック全体を raw HTML として扱うため）。Fix 9 はこれを AST パースの前に `<a href="url">text</a>` タグに変換します。

---

## remarkNfm

`remarkNfm` は `remark-nfm` パッケージのコア remark プラグインです。1 つのプラグインに 3 つの操作をまとめています：

1. **`preprocessNotionMarkdown`** — 上記の文字列修正をパース前に実行
2. **`remark-directive`** — `:::callout{…}` ディレクティブ構文を有効化
3. **`remark-gfm`** — GFM 打ち消し線（`~~text~~`）とタスクリスト（`- [x]`）サポート
4. **コールアウト変換** — `:::callout` ディレクティブ AST ノードを raw `<callout icon="…" color="…">` HTML 要素に変換

### コールアウト構文

Notion は Fix 2 の後、以下のディレクティブフォーマットでコールアウトをエクスポートします：

```md
:::callout{icon="💡" color="blue"}
コールアウトのコンテンツ
:::
```

`remarkNfm` はこれを以下に変換します：

```html
<callout icon="💡" color="blue">
コールアウトのコンテンツ
</callout>
```

---

## rehype プラグイン

### rehypeRaw

markdown AST に埋め込まれた raw HTML 文字列を適切な hast ノードに変換し、後続の rehype プラグインがそれらをトラバース・変換できるようにします。カスタム Notion 要素（`<callout>`、`<columns>`、`<video>` など）は不明な要素として通過します。

### rehypeNotionColor

Notion のカラー属性を notro CSS クラスに変換します：

| 入力属性 | 出力クラス |
|---|---|
| `color="gray"` | `notro-text-gray` |
| `color="gray_background"` | `notro-bg-gray` |
| `underline="true"` | `notro-underline` |

`<p>`、`<h1>`–`<h6>`、`<span>` 要素に適用されます。

### rehypeBlockElements

MDX がコンポーネントマップを通じてルーティングできるよう、小文字の Notion ブロック要素名を PascalCase にリネームします：

| 変換前 | 変換後 |
|---|---|
| `<video>` | `<Video>` |
| `<columns>` | `<Columns>` |
| `<column>` | `<Column>` |
| `<table_of_contents>` | `<TableOfContents>` |
| `<callout>` | `<Callout>` |
| `<empty-block>` | `<EmptyBlock>` |

### rehypeInlineMentions

インライン Notion mention 要素も同様にリネームします：

| 変換前 | 変換後 |
|---|---|
| `<mention-user>` | `<MentionUser>` |
| `<mention-page>` | `<MentionPage>` |
| `<mention-date>` | `<MentionDate>` |

### rehypeSlug

テキストコンテンツに基づいて `<h1>`–`<h4>` 見出しに `id` 属性を追加し、アンカーリンクを有効にします。

### rehypeToc

`id` 属性を持つすべての見出しを収集し、ページの `<TableOfContents>` 要素（存在する場合）にアンカーリンクリストを設定します。見出し階層を反映したネスト構造を生成します。

### resolvePageLinks

`<a href>`、`<PageRef>`、`<DatabaseRef>`、mention 要素の `notion.so/PAGE_ID` URL を、`NotroContent` に渡された `linkToPages` マップのサイト相対 URL に置き換えます。

---

## remark-nfm パッケージ

`remark-nfm` はスタンドアロンの npm パッケージとして公開されています。Astro や Notion API への依存はなく、任意の remark パイプラインで使用できます：

```ts
import { remarkNfm } from "remark-nfm";
import { remark } from "remark";

const result = await remark()
  .use(remarkNfm)
  .process(notionMarkdown);
```

`preprocessNotionMarkdown` 関数は remark の外でも使用するためにエクスポートされています：

```ts
import { preprocessNotionMarkdown } from "remark-nfm";

const fixed = preprocessNotionMarkdown(rawMarkdown);
```
