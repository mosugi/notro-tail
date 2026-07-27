---
slug: ja/guides/customizing-components
title: コンポーネントのカスタマイズ
---

# コンポーネントのカスタマイズ

notro は Notion ブロックを Astro コンポーネントでレンダリングします。このページではブロックの見た目と動作をカスタマイズする 3 つの方法を説明します。

## notro-ui: コピーして使うコンポーネント

Notion ブロックコンポーネントは `notro-ui` CLI で管理します。コンポーネントは `packages/notro-ui/src/templates/` にソースとして置かれており、プロジェクトにコピーすることで自分のコードとして扱えます。

### CLI のインストール

```bash
npm i -g notro-ui
# または pnpm dlx で使用：
pnpm dlx notro-ui --help
```

### プロジェクトにコンポーネントを追加する

プロジェクトルート（`notro.json` を置く場所）で以下を実行します：

```bash
# 初期化（notro.json を作成し、notro-theme.css を配置）
notro-ui init

# すべてのコンポーネントを追加（既存ファイルはスキップ）
notro-ui add --all

# 特定のコンポーネントを追加
notro-ui add callout toggle columns
```

### アップストリームからコンポーネントを更新する

```bash
# 更新を取得（ローカルの変更を上書き — 注意して使用）
notro-ui update --all --yes

# 変更をプレビュー（--yes なしで確認プロンプトを表示）
notro-ui update --all
```

### 利用可能なコマンド

| コマンド | 動作 |
|---|---|
| `notro-ui init` | `notro.json` を作成し、`notro-theme.css` を配置 |
| `notro-ui add [name...] [--all]` | コンポーネントを追加（**既存ファイルはスキップ**） |
| `notro-ui update [name...] [--all] [--yes]` | コンポーネントを更新（**上書き**） |
| `notro-ui remove [name...] [--all]` | コンポーネントを削除 |
| `notro-ui list [--installed]` | 利用可能・インストール済みコンポーネントを一覧表示 |

### notro.json

`notro-ui init` はプロジェクトルートに `notro.json` を作成します：

```json
{
  "outDir": "src/components/notion",
  "stylesDir": "src/styles",
  "components": ["callout", "toggle", "columns", "code-block"]
}
```

インストール済みのコンポーネントを追跡するために `notro.json` を git にコミットしてください。

---

## classMap による CSS クラスのオーバーライド

コンポーネントを置き換えずにスタイルをカスタマイズする最も簡単な方法は、`NotroContent` の `classMap` プロパティです。`ClassMapKeys → string` の部分マップを渡して、特定の要素に追加の Tailwind クラスを注入できます：

```astro
---
import { NotroContent } from "notro-loader";
const { entry } = Astro.props;
---
<NotroContent
  markdown={entry.data.markdown}
  classMap={{
    callout: "rounded-xl border-2",
    toggle: "my-4",
    codeBlock: "text-sm",
  }}
/>
```

クラスマップのキーはコンポーネントスロットに対応します。利用可能なキーは `notro-ui list` で確認できます。

---

## components による完全なコンポーネントオーバーライド

完全なコントロールが必要な場合は、`components` プロパティでカスタム Astro コンポーネントを渡します：

```astro
---
import { NotroContent } from "notro-loader";
import MyCallout from "./MyCallout.astro";
import MyCodeBlock from "./MyCodeBlock.astro";
const { entry } = Astro.props;
---
<NotroContent
  markdown={entry.data.markdown}
  components={{
    callout: MyCallout,
    pre: MyCodeBlock,
  }}
/>
```

指定したキーのみがオーバーライドされ、他はすべて notro のデフォルトコンポーネントが使われます。

### カスタムコンポーネントの書き方

コンポーネントのプロパティは Notion が生成する HTML 属性をミラーします。例えば、カスタムコールアウトは `icon`、`color`、スロットコンテンツを受け取ります：

```astro
---
// MyCallout.astro
interface Props {
  icon?: string;
  color?: string;
}
const { icon, color } = Astro.props;
---
<aside class:list={["my-callout", color && `my-callout--${color}`]}>
  {icon && <span class="my-callout__icon">{icon}</span>}
  <div class="my-callout__body">
    <slot />
  </div>
</aside>
```

### コンポーネントマップのリファレンス

| キー | 要素 | Notion ブロック |
|---|---|---|
| `callout` | `<callout>` | コールアウトブロック |
| `toggle` | `<details>` | トグルブロック |
| `columns` | `<columns>` | カラムレイアウトラッパー |
| `column` | `<column>` | 個別のカラム |
| `video` | `<video>` | 動画埋め込み |
| `table_of_contents` | `<table_of_contents>` | 目次 |
| `empty_block` | `<empty-block>` | 空のスペーシングブロック |
| `pre` | `<pre>` | コードブロック |
| `img` | `<img>` | 画像 |
| `a` | `<a>` | リンク |
| `h1`–`h4` | `<h1>`–`<h4>` | 見出し |

---

## notro-theme.css によるスタイリング

`notro-theme.css` は Notion ブロックカラー、トグルスタイル、テーブルスタイルなどの CSS 変数とユーティリティクラスを定義します。`notro-ui init` によって `src/styles/` に配置されます。

グローバルスタイルシートでインポートします：

```css
/* global.css */
@import "tailwindcss";
@import "./notro-theme.css";
```

### カラートークン

```css
/* テキストカラー */
.notro-text-gray    .notro-text-brown   .notro-text-orange
.notro-text-yellow  .notro-text-green   .notro-text-blue
.notro-text-purple  .notro-text-pink    .notro-text-red

/* 背景カラー */
.notro-bg-gray      .notro-bg-brown     .notro-bg-orange
.notro-bg-yellow    .notro-bg-green     .notro-bg-blue
.notro-bg-purple    .notro-bg-pink      .notro-bg-red
```

これらは Notion ページにカラーアノテーション付きブロックが含まれている場合に `rehypeNotionColor` プラグインが自動的に適用します。
