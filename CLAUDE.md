# NotroTail - CLAUDE.md

## Project Overview
NotroTail: Notion + Astro + TailwindCSS の CMS。Notionのコンテンツを静的サイトとして配信。
モノレポ構成（npm workspaces）:
- `packages/notro`: Astro Content Loader ライブラリ（npm公開予定）
- `apps/notro-tail`: リファレンス実装デモアプリ

## Notion Enhanced Markdown 仕様

NotionのMarkdown Content APIが出力する拡張Markdown形式の仕様。
`notro` ライブラリ（`packages/notro`）がこの形式のパースとHTML変換を担う。

参照ドキュメント:
- https://developers.notion.com/guides/data-apis/working-with-markdown-content
- https://developers.notion.com/guides/data-apis/enhanced-markdown

### 基本ルール
- **インデント**: 子ブロックは親より1タブ深くインデント
- **エスケープ**: `\ * ~ ` ` $ [ ] < > { } | ^` をバックスラッシュでエスケープ（コードブロック内は不要）
- **色名**: `gray` `brown` `orange` `yellow` `green` `blue` `purple` `pink` `red` と `{色}_bg`（背景色）

### ブロックタイプ一覧

#### テキスト・見出し
```
テキスト {color="blue"}
# 見出し1 {color="Color"}
## 見出し2
### 見出し3
#### 見出し4
```
- 見出し5・6はAPIが見出し4に変換、子ブロック不可

#### リスト・Todo
```
- 箇条書き {color="Color"}
	子ブロック（タブインデント）
1. 番号付きリスト {color="Color"}
- [ ] 未チェック
- [x] チェック済み {color="Color"}
```

#### 引用・区切り線
```
> 引用テキスト {color="Color"}
---
```
- 複数行引用は `<br>` タグで改行

#### Toggle（`togglePlugin`が処理）
```html
<details color="Color"><summary>タイトル</summary>子ブロック</details>
```
または
```
## 見出しトグル {toggle="true" color="Color"}
	子ブロック
```

#### Callout（`calloutPlugin`が処理）
```
::: callout {icon="💡" color="gray_bg"}
本文テキスト
	子ブロック（タブインデント）
:::
```
- **注意**: Notionの実際の出力は `"::: callout"` （スペースあり）・タブインデントあり
- `normalizeDirectives()` でスペース除去・ネストをフラット化してから remark-directive に渡す

#### コード・数式
````
```言語名
コード内容（エスケープ不要）
```
$$ 数式（ブロック） $$
`インライン数式 $x^2$`
````

#### テーブル
```html
<table>
  <colgroup><col/><col/></colgroup>
  <tr><td color="Color">セル</td><td>セル</td></tr>
</table>
```
- `<tr>`, `<td>`, `<colgroup>/<col>` に `color` 属性付与可

#### Columns（`columnsPlugin`が処理）
```html
<columns>
	<column>
		列1の内容
	</column>
	<column>
		列2の内容
	</column>
</columns>
```

#### メディア
```
![キャプション](URL) {color="Color"}
<audio src="URL">キャプション</audio>
<video src="URL">キャプション</video>
<file src="URL">キャプション</file>
<pdf src="URL">キャプション</pdf>
```

#### Page / Database Reference（`pageLinkPlugin`が処理）
```html
<page url="https://www.notion.so/..." color="Color">ページタイトル</page>
<database url="https://www.notion.so/..." inline="true|false">DB名</database>
```
- `linkToPages` マッピングでNotionページIDをサイト内URLに変換

#### その他ブロック
```html
<table_of_contents color="Color"/>
<synced_block url="URL">子ブロック</synced_block>
```

#### 特殊タグ（`cleanupPlugin`が処理）
```html
<empty-block/>                          <!-- 空行（plain空行は除去される） -->
<unknown href="https://...">...</unknown>  <!-- 未対応ブロック(Bookmark/Embed等) -->
<synced_block url="URL">子ブロック</synced_block>         <!-- 子ブロックをそのまま展開 -->
<synced_block_reference url="URL">...</synced_block_reference>  <!-- HTMLコメントに変換 -->
```

### リッチテキスト書式

```
**太字**   *イタリック*   ~~打消し~~
<span underline="true">下線</span>
`インラインコード`
[リンクテキスト](URL)
$インライン数式$
<br>（改行）
<span color="Color">色付きテキスト</span>
```

### Color属性（`colorPlugin`が処理）
- ブロックレベル: 行末に `{color="blue"}` を付与
- インライン: `<span color="blue">text</span>`

### Mention タグ（現在 notro では未処理）
```html
<mention-user url="URL">名前</mention-user>
<mention-page url="URL">ページ名</mention-page>
<mention-database url="URL">DB名</mention-database>
<mention-date start="2024-01-01"/>
<mention-date start="2024-01-01" end="2024-12-31" include_time="true" time_zone="Asia/Tokyo"/>
```

### その他構文
```
:emoji_name:      # カスタム絵文字
[^URL]            # 引用/Citation
```

### API 概要
- `GET /v1/pages/:page_id/markdown` → `{ markdown, truncated, unknown_block_ids }`（Public integrationのみ）
- `POST /v1/pages` + `markdown` bodyパラメータでページ作成
- `PATCH /v1/pages/:page_id/markdown` でコンテンツの挿入・置換
  - `insert_content`: 指定テキストの後に追記
  - `replace_content_range`: `"start text...end text"` 形式で範囲指定置換（`allow_deleting_content: true` で子ページ削除も可）

---

## Markdown Documentation (再利用可能な情報)

### @notionhq/client v5 Breaking Changes
- `databases.query` → `dataSources.query`
- `database_id` → `data_source_id`
- search filter: `filter.value: "database"` → `"data_source"`
- page の `parent.type` に `"data_source_id"` が追加
- `ClientOptions` は `@notionhq/client/build/src/Client` からimport（indexから非re-export）
- `QueryDataSourceParameters` は `@notionhq/client/build/src/api-endpoints` からimport
- ページ取得: `client.pages.retrieveMarkdown({ page_id })` → `{ markdown, truncated, unknown_block_ids }`

### unified Pipeline (transformer.ts)
```
remark-parse
→ remark-directive       # :::directive 構文のパース
→ calloutPlugin          # remark: :::callout{icon color} → <div class="nt-callout nt-color-...">
→ remark-rehype          # mdast → hast 変換 (allowDangerousHtml: true)
→ rehype-raw             # 生HTMLをhastに変換
→ columnsPlugin          # rehype: <columns>/<column> → <div class="nt-column-list/nt-column">
→ colorPlugin            # rehype: color属性 → class="nt-color-..."
→ pageLinkPlugin         # rehype: <page url="..."> → <a href="...">
→ togglePlugin           # rehype: <details> に nt-toggle-block クラス追加
→ cleanupPlugin          # rehype: <empty-block/> <unknown> <synced_block_reference> → HTMLコメント
→ rehype-stringify
```

### normalizeDirectives (transformer.ts)
Notionが出力するdirective形式（スペース・タブインデント）を remark-directive 互換に変換する前処理。
- `"::: callout {attrs}"` → `":::callout{attrs}"` （スペース除去）
- タブインデントされたネストdirectiveをフラット化
- ネストを含む外側の `:::` クローズタグは除去（内側directiveをフラット化したため不要）

### CSS クラス規則
- `nt-callout` / `nt-color-{color}` — calloutブロック
- `nt-column-list` / `nt-column` — カラムレイアウト
- `nt-toggle-block` — トグルブロック（`<details>`）
- `nt-page-link` / `nt-page-link-broken` — ページ内リンク

### OptimizedDatabaseCover の注意点
- Notion uploaded files（`cover.type === "file"`）はS3署名付きURL（1時間で失効）
- 署名付きURLはビルド時にAstro Imageが寸法取得できないためフォールバックとして `<img>` タグを使用
- `cover.type === "external"` の場合は通常の `<AstroImage>` で最適化可能

### Loader 設計
- `loader({ queryParameters, clientOptions })` → Astro `Loader`
- `queryParameters` に `data_source_id` を指定（`QueryDataSourceParameters`型）
- `client.pages.retrieveMarkdown()` で markdown を取得
- `pageWithMarkdownSchema` = `pageObjectResponseSchema.extend({ markdown: z.string() })`
- 差分更新: `digest = last_edited_time` で変更検知、削除・更新・追加を処理

### Schema 設計 (schema.ts)
- ブロックスキーマは削除済み（旧APIの名残）
- プロパティスキーマ（`titlePropertyPageObjectResponseSchema` 等）は維持
- `pageObjectResponseSchema` のparent unionに `data_source_id` 型を含む

### Content Collection 設定パターン (content.config.ts)
```typescript
import { loader, pageWithMarkdownSchema } from "notro";

const collection = defineCollection({
  loader: loader({
    queryParameters: {
      data_source_id: import.meta.env.NOTION_DATA_SOURCE_ID,
      // sorts, filter を指定
    },
    clientOptions: { auth: import.meta.env.NOTION_TOKEN },
  }),
  schema: pageWithMarkdownSchema.extend({
    properties: z.object({
      // Notionのプロパティ名と型をここに定義
    }),
  }),
});
```

### NotionMarkdownRenderer コンポーネント
```astro
import { NotionMarkdownRenderer } from "notro";
// entry.data.markdown を渡してHTML変換・レンダリング
<NotionMarkdownRenderer markdown={entry.data.markdown} linkToPages={linkToPages} />
```

## Key Files
- Loader: `packages/notro/src/loader/loader.ts`
- Schema: `packages/notro/src/loader/schema.ts`
- Markdown transformer: `packages/notro/src/markdown/transformer.ts`
- Markdown plugins: `packages/notro/src/markdown/plugins/` (callout, columns, color, page-link, toggle, cleanup)
- Public API: `packages/notro/index.ts`
- Content config: `apps/notro-tail/src/content.config.ts`
- Env: `apps/notro-tail/.env`（gitignore済み）

## 実稼働データ (notro-tail参照実装)
- `NOTION_TOKEN` = `NOTION_ACCESS_TOKEN` の値を使用
- `NOTION_PAGES_ID` = `d0ca07ad-1f0e-8335-85d0-071322e5813c` (NotroTail Template)
  - プロパティ: `Page`(title), `Public`(checkbox), `Slug`(rich_text), `Type`(multi_select), `Order`(number), `Description`(rich_text)
  - `Type` の値: `Home`, `Header`, `Footer`, `Collection` 等
- `NOTION_POSTS_ID` = `012a07ad-1f0e-83cf-a436-8788e6ee234f` (Contents)
  - プロパティ: `Name`(title), `Description`(rich_text), `Public`(checkbox), `Slug`(rich_text), `Tags`(multi_select), `Category`(select), `Date`(date)

## Deployment
- Vercel: `mosugeek` チーム、プロジェクト `notro-tail`
  - チームID: `team_95QGeJkI15DWAIMypBnlR83J`
  - プロジェクトID: `prj_qkiC0ARWCXlH8AB0Z5A5EJVcJQM8`
- ブランチ: `main`（本番）、`feature/*`（PR）

## User Preferences
- コミットは明示的に依頼されたときのみ
