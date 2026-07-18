<p>
<a href="README.md">English</a>
 | 
<a href="./README.ja.md">日本語</a>
<!-- |
<a href="./README.zh.md">中文</a>
 |
<a href="./README.ko.md">한국어</a>-->
</p>

![NotroTail.webp](docs%2Fpublic%2FNotroTail.webp)

<p align="center">
<a href="https://notrotail.mosugi.com">WebSite</a>
 | 
<a href="https://notrotail.mosugi.com/doc">Documentation</a>
 | 
<a href="https://notro.mosugi.com">Quick Start</a>
</p>

> [!NOTE]
> NotroTailは現在アルファリリースです。安定したリリースのために、フィードバックをお寄せください

## デモ

<p align="center">
<a href="https://mosugeek.notion.site/NotroTail-f3d908099c714fbfa6c4d792d1b6d3f2">Original</a>
 | 
<a href="https://notrotail.mosugi.com">NotroTail</a>
</p>

![BeforeAfter.png](docs%2Fpublic%2FBeforeAfter.png)

## クイックスタート

```sh
npm create notro@latest my-site
```

CLIがスターターテンプレートをダウンロードし、`.env.example` から `.env` を作成し、依存関係のインストールを行います。その後 `.env` に Notion の認証情報を設定して `npm run dev` を実行してください。

## 特徴

### 🚀 コンテンツファースト

Notionの使いやすいインターフェースでコンテンツを作成し、Webサイトを構築できます。コーディングの知識は不要です

### ⚡️ 高いパフォーマンス

WebサイトはAstroによって静的なHTMLとして出力されるため、非常に高速でSEOにも最適化されます。個人のブログにもビジネス目的でも快適な体験を提供します

### 🔌 ブロック取得不要で高速なAPI

Notion の [Markdown Content API](https://developers.notion.com/guides/data-apis/working-with-markdown-content) に対応しているため、ページ内容をブロックごとに個別取得する必要がありません。1回のAPIコールでページ全体の Markdown を取得できるため、ビルド時のAPI呼び出し回数が大幅に削減され、高速なビルドを実現します

### 📷 画像の最適化

Notionで利用している画像は、Astro Assetsによりデバイスごとに最適化されたWebP形式のファイルで配信されます

### 🎨 モダンなスタイリング

TailwindCSSが提供するユーティリティが組み込まれており、モダンでレスポンシブなサイトを簡単に構築できます

### 📚 テンプレート&フリーフォーマット

データベース形式のテンプレートからWebサイトを生成する方法のほか、特定のページからフリーフォーマットで作成することもできます

### 🔧 高度なカスタマイズ

tailwind.cssで定義済みのCSSを変更することに加えて、本来の使い方と同じ様にNotionでも直接ユーティリティを適用でき、コンテンツに近い箇所で見た目を定義できます。さらにHTMLも書けるため高度なカスタマイズが可能です

[Tailwind PlayでNotroTailのスタイルを確認する](https://play.tailwindcss.com/2RILChyT7h)

## インストール方法

ローカル環境や任意の環境で動かす場合の方法です

### 1. Notion Internal Integrationを作成する

[Create an integration](https://developers.notion.com/docs/create-a-notion-integration##step-1-create-an-integration) からインテグレーションを作成し **Internal Integration Token** を `NOTION_TOKEN` として記録します

### 2. Notionページを選択または作成する

テンプレートを複製するか、既存のNotionページを選択します。NotroTailはどのNotionページでも機能しますが、テンプレートを利用するとヘッダーやブログ機能などのリッチな機能が利用できるようになります

### 3. NotionのIDを特定する

URLのID部を `NOTION_ID` として記録します

```plaintext
https://www.notion.so/myworkspace/a8aec43384f447ed84390e8e42c2e089?v=...
                                 |---------- NOTION_ID ----------|
```

### 4. Integrationを設定

 [Share a database with your integration](https://developers.notion.com/docs/create-a-notion-integration##step-2-share-a-database-with-your-integration) の手順でインテグレーションにページを共有します

### 5. 環境変数を指定

```bash
NOTION_TOKEN=<NOTION_TOKEN>
NOTION_DATASOURCE_ID=<NOTION_ID>
```

### 6. 起動する

依存関係をインストールします：

```bash
npm install
```

開発サーバーを起動します：

```bash
npm run dev
```

ブラウザで [http://localhost:4321](http://localhost:4321/) を開きます

## デプロイ

NotroTail は Astro の静的出力モードを使用しています。SSR アダプター不要で各プラットフォームにデプロイできます。設定ファイルはリポジトリに含まれています。

### Vercel

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https%3A%2F%2Fgithub.com%2Fmosugi%2Fnotro&root-directory=templates%2Fblog&env=NOTION_TOKEN,NOTION_DATASOURCE_ID&envDescription=Notion%20API%20credentials&project-name=notro-blog&repository-name=notro)

1. 上のボタンをクリック、または [vercel.com](https://vercel.com) でリポジトリをインポート
2. 環境変数 `NOTION_TOKEN` と `NOTION_DATASOURCE_ID` を追加
3. **Deploy** をクリック — ビルド設定は `vercel.json` が自動で処理

### Netlify

[![Deploy to Netlify](https://www.netlify.com/img/deploy/button.svg)](https://app.netlify.com/start/deploy?repository=https://github.com/mosugi/notro)

1. 上のボタンをクリック、または [netlify.com](https://app.netlify.com) でリポジトリをインポート
2. 環境変数 `NOTION_TOKEN` と `NOTION_DATASOURCE_ID` を追加
3. **Deploy** をクリック — ビルド設定は `netlify.toml` が自動で処理

### Cloudflare Pages

[![Deploy to Cloudflare](https://deploy.workers.cloudflare.com/button)](https://deploy.workers.cloudflare.com/?url=https://github.com/mosugi/notro)

1. 上のボタンをクリック、または [Cloudflare ダッシュボード](https://dash.cloudflare.com) で **Workers & Pages → Create → Pages → Connect to Git**
2. リポジトリを選択し、以下のビルド設定を入力:
   ```
   Build command:    npm run build
   Build output dir: templates/blog/dist
   Root directory:   (空欄のまま)
   ```
3. 環境変数 `NOTION_TOKEN` と `NOTION_DATASOURCE_ID` を追加
4. **Save and Deploy** をクリック — `wrangler.toml` も参考として同梱されています

> Notion のコンテンツを更新した後は、プラットフォームのダッシュボードから手動で再デプロイをトリガーしてください。

## リポジトリ構成

このリポジトリは **pnpm workspace モノレポ** で、以下のパッケージを含んでいます：

| パッケージ | パス | 役割 |
|---|---|---|
| [`remark-nfm`](./packages/remark-nfm/) | `packages/remark-nfm/` | Notion Flavored Markdown 向けの remark プラグイン。前処理（10 件の修正）・`:::callout` ディレクティブ構文・コールアウト変換をまとめたもの。Astro / Notion API 非依存で npm に単独公開可能。 |
| [`notro-loader`](./packages/notro-loader/) | `packages/notro-loader/` | Astro + Notion API 統合ライブラリ。Content Loader・MDX コンパイルパイプライン（内部で `remark-nfm` を使用）・ヘッドレス Astro コンポーネントを提供。 |
| [`notro-ui`](./packages/notro-ui/) | `packages/notro-ui/` | `notro-loader` 向けのコピー所有型スタイル済みコンポーネント（shadcn と同じ思想）。`notro-ui add --all` でプロジェクトにコンポーネントをインストール — インストール後はあなたのコードになり、直接編集できます。 |
| [`satteri-beautiful-mermaid`](./packages/satteri-beautiful-mermaid/) | `packages/satteri-beautiful-mermaid/` | Mermaid コードブロックをビルド時にインライン SVG にレンダリングする Sätteri hast プラグイン。 |
| [`create-notro`](./packages/create-notro/) | `packages/create-notro/` | CLI スキャフォールディングツール。`npm create notro@latest` でテンプレートを選択してサイトを作成。 |
| `notro-blog` (blog) | `templates/blog/` | フル機能ブログテンプレート。リファレンス実装として使用され、`create-notro`（`npm create notro@latest`）でも取得できます。 |
| `notro-blank` (blank) | `templates/blank/` | 最小構成スターター。ページ一覧と Notion コンテンツのレンダリングのみ。 |
| `docs` | `docs/` | Astro Starlight で構築されたドキュメントサイト。 |

**依存関係グラフ:**
```
remark-nfm  ←  notro-loader  ←  notro-ui  ←  notro-blog
                                     ↑               ↑
                               create-notro  →  templates/blank
```

## 制限事項

### コンテンツの切り詰め

Notion API はページコンテンツを約 **20,000 ブロック**で切り詰めて返します。このエンドポイントにはページネーション API がないため、切り詰められたコンテンツを全件取得する方法がありません。notro は警告ログを出力し、取得できた範囲でビルドを継続します。

**対処法:** 大きな Notion ページを複数のサブページに分割してください。

### レンダリング不能なブロック

一部の Notion ブロック型は Notion API によって Markdown に変換されず、レスポンスから無言で除外されます。notro は除外されたブロックの ID を警告ログに出力するので、該当コンテンツを確認・修正できます。

詳細は [Notion API ドキュメント](https://developers.notion.com/reference/retrieve-page-markdown) および [`notro-loader` README](./packages/notro-loader/README.md#notion-api-limitations) を参照してください。

## Contributing

バグ報告や機能要望は Issue を作成してください。どんなことでも、どんな言語でも大丈夫です。お気軽にどうぞ。プルリクエストももちろん歓迎します。

## Roadmap

[Github Projectsのロードマップを見る](https://github.com/users/mosugi/projects/4)

## Licence

MIT

## Special Thanks

NotroTail は下記のリポジトリから着想を得て開発されました

- [Next.js Notion Starter Kit](https://github.com/transitive-bullshit/nextjs-notion-starter-kit)
    - 初めてNotionをベースとしてWebSiteを作るのに利用させてもらいました
- [Astro Notion Blog](https://github.com/otoyo/astro-notion-blog)
    - Astroベースのブログを作るのに利用させてもらいました
- [AstroWind](https://github.com/onwidget/astrowind)
    - デザインの参考にさせてもらいました
