---
slug: ja/getting-started/introduction
title: イントロダクション
---

# イントロダクション

**notro** は Notion を Astro に変換する静的サイトジェネレーターです。Notion Public API を通じてコンテンツを取得し、MDX としてコンパイルし、すべての Notion ブロックタイプをスタイル付き Astro コンポーネントにマッピングします。CMS を別途管理することなく、高速で SEO 最適化された静的サイトを生成できます。

## なぜ notro を使うのか

Notion は強力な執筆ツールですが、そのコンテンツを洗練されたウェブサイトとして公開するには、従来はカスタム API 統合と手動のレンダリングロジックが必要でした。notro がそのすべてを処理します：

- **ビルド時のレンダリングレイテンシーゼロ** — ページはビルド時に静的生成されます
- **Notion ブロックの完全サポート** — コールアウト、トグル、カラム、同期ブロック、数式など
- **MDX パイプライン** — remark/rehype プラグイン（数式、Mermaid 図、シンタックスハイライト）を Notion コンテンツと組み合わせて使用
- **コピーして使うコンポーネント** — notro-ui が自由にカスタマイズできるスタイル付き Notion ブロックコンポーネントを提供
- **複数のテンプレート** — フル機能のブログテンプレートまたはミニマルな blank テンプレートから始められます

## 仕組み

notro は [Astro Content Collections](https://docs.astro.build/en/guides/content-collections/) の上に構築されています。`loader()` 関数はカスタムコンテンツローダーとして動作します：

1. `dataSources.query` を通じて Notion データソースのページ一覧を取得
2. `pages.retrieveMarkdown` で各ページの Markdown を取得
3. `last_edited_time` でページをキャッシュし、再ビルド時の不要な API 呼び出しを回避
4. 前処理済みの Markdown を Content Collection ストアに保存

レンダリング時、`NotroContent` コンポーネントが保存された Markdown を MDX パイプラインでコンパイルし、Notion コンポーネントマッピングで描画します。

```
Notion データベース
  ↓  notro-loader（Astro Content Loader）
Content Collection ストア
  ↓  NotroContent + compileMdx
レンダリング済み HTML ページ
```

## パッケージ

notro はモノレポです。公開されている npm パッケージは以下のとおりです：

| パッケージ | 用途 |
|---|---|
| `notro-loader` | Astro Content Loader + MDX コンパイルパイプライン + Notion ブロックコンポーネント |
| `remark-nfm` | Notion Flavored Markdown 正規化用 remark プラグイン |
| `notro-ui` | コピーして使うスタイル付き Notion ブロックコンポーネント（shadcn スタイル） |
| `rehype-beautiful-mermaid` | Mermaid コードブロックをビルド時にインライン SVG にレンダリング |
| `create-notro` | CLI スキャフォールディングツール（`npm create notro@latest`） |

## テンプレート

2 種類のスターターテンプレートが利用できます：

- **notro-blog** — ページネーション、タグ、カテゴリ、RSS、サイトマップを備えたフル機能のブログ
- **notro-blank** — カスタムプロジェクト向けのミニマルな一ページスターター

どちらのテンプレートも TailwindCSS 4、notro-ui コンポーネント、MDX パイプラインが事前設定されています。

## 次のステップ

- [クイックスタート](/ja/getting-started/quick-start) — 数分でプロジェクトを作成して Notion に接続
- [Notion セットアップ](/ja/getting-started/notion-setup) — インテグレーションの作成とデータベースの設定方法
