---
slug: ja/reference/notro-content
title: NotroContent
---

# NotroContent

`NotroContent` は前処理済みの Notion markdown をコンパイルしてレンダリングする Astro コンポーネントです。MDX のコンパイル、コンポーネントマッピング、オプションの内部リンク解決を処理します。

## インポート

```ts
import { NotroContent } from "notro-loader";
```

## 使い方

```astro
---
import { NotroContent } from "notro-loader";
const { entry } = Astro.props;
---
<div class="notro-markdown">
  <NotroContent markdown={entry.data.markdown} />
</div>
```

## プロパティ

```ts
interface Props {
  markdown: string;
  linkToPages?: Record<string, { url: string; title: string }>;
  classMap?: Partial<Record<ClassMapKeys, string>>;
  components?: Partial<NotionComponents>;
}
```

### markdown（必須）

Content Collection エントリの前処理済み markdown 文字列。ローダーが `entry.data.markdown` として保存した値です。

```astro
<NotroContent markdown={entry.data.markdown} />
```

### linkToPages

内部 Notion ページリンクを解決するための、Notion ページ UUID から `{ url, title }` へのマップ。Notion ページが別の Notion ページへのリンクを含む場合、`NotroContent` は `notion.so` URL を対応するサイト相対 URL に置き換えます。

```astro
---
import { getCollection } from "astro:content";
import { buildLinkToPages } from "notro-loader/utils";

const allPosts = await getCollection("posts");
const linkToPages = buildLinkToPages(allPosts);
---
<NotroContent
  markdown={entry.data.markdown}
  linkToPages={linkToPages}
/>
```

`buildLinkToPages` はすべてのエントリを反復して、各 `entry.id` を `{ url: "/blog/" + entry.data.slug, title: entry.data.title }` にマッピングしてマップを構築します。

### classMap

コンポーネントスロットから追加の Tailwind クラス文字列への部分マップ。コンポーネント全体を置き換えずにスタイルをカスタマイズするために使います。

```astro
<NotroContent
  markdown={entry.data.markdown}
  classMap={{
    callout: "rounded-xl border-2",
    toggle: "my-6",
    codeBlock: "text-sm font-mono",
    table: "w-full",
  }}
/>
```

利用可能なキーは notro-ui コンポーネントスロットに対応します。インストール済みのコンポーネントとクラスマップキーは `notro-ui list --installed` で確認できます。

### components

Notion ブロックタイプからカスタム Astro コンポーネントへの部分マップ。notro のデフォルトにマージされ、指定したキーのみがオーバーライドされます。

```astro
---
import MyCallout from "./MyCallout.astro";
import MyToggle from "./MyToggle.astro";
---
<NotroContent
  markdown={entry.data.markdown}
  components={{
    callout: MyCallout,
    toggle: MyToggle,
  }}
/>
```

#### コンポーネントマップキー

| キー | HTML 要素 | Notion ブロック |
|---|---|---|
| `callout` | `<callout>` | コールアウト |
| `toggle` | `<details>` | トグル |
| `columns` | `<columns>` | カラムレイアウトラッパー |
| `column` | `<column>` | 個別のカラム |
| `video` | `<video>` | 動画埋め込み |
| `table_of_contents` | `<table_of_contents>` | 目次 |
| `empty_block` | `<empty-block>` | 空のブロック |
| `pre` | `<pre>` | コードブロック |
| `img` | `<img>` | 画像 |
| `a` | `<a>` | リンク |
| `h1`–`h4` | `<h1>`–`<h4>` | 見出し |
| `p` | `<p>` | 段落 |
| `blockquote` | `<blockquote>` | 引用 |
| `table` | `<table>` | テーブル |

## MDX コンパイルキャッシング

`NotroContent` は内部で `compileMdxCached()` を使います。これは markdown 文字列のハッシュをキーとしてコンパイル済み MDX モジュールをキャッシュします。単一ビルド内で同じページが再レンダリングされる場合、MDX コンパイラを再呼び出しせずにキャッシュ済みモジュールを再利用します。

## CSS ラッパー

`notro-markdown` CSS クラスは `NotroContent` の出力をラップする要素に適用されます（`NotroContent` 自体ではなく、テンプレートの親要素で適用）。`notro-theme.css` のこのクラスは以下のスタイルをスコープします：

- `<pre>` / `<code>` ブロック
- タスクリストのチェックボックス
- テーブル
- 引用

```astro
<!-- レイアウトでラッパークラスを適用 -->
<div class="notro-markdown">
  <NotroContent markdown={entry.data.markdown} />
</div>
```

## 型リファレンス

```ts
import type { NotionComponents, ClassMapKeys } from "notro-loader";

interface NotroContentProps {
  markdown: string;
  linkToPages?: Record<string, { url: string; title: string }>;
  classMap?: Partial<Record<ClassMapKeys, string>>;
  components?: Partial<NotionComponents>;
}
```
