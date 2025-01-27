<p>
<a href="README.ja.md">English</a>
 | 
<a href="./README.ja.md">日本語</a>
<!-- |
<a href="./README.zh.md">中文</a>
 |
<a href="./README.ko.md">한국어</a>-->
</p>

![NotroTail.webp](docs%2Fpublic%2FNotroTail.webp)

<p align="center">
<a href="https://notrotail.mosugi.com">Website</a>
 | 
<a href="https://notrotail.mosugi.com/doc">Documentation</a>
 | 
<a href="https://notro.mosugi.com">Quick Start</a>
</p>

> [!NOTE]
> NotroTail is currently in alpha release. Please provide feedback to help us achieve a stable release.

## Demo

<p align="center">
<a href="https://mosugeek.notion.site/NotroTail-f3d908099c714fbfa6c4d792d1b6d3f2">Original</a>
 | 
<a href="https://notrotail.mosugi.com">NotroTail</a>
</p>

![BeforeAfter.png](docs%2Fpublic%2FBeforeAfter.png)

## Quick Start

Using [Notro Connect](https://notro.mosugi.com/) (Notion Public Integration), you can automatically set up IDs and tokens and deploy to platforms like Netlify in just a few steps. Give it a try! (And don't forget to star the repository!)

[Deploy to Netlify or Vercel with Notro Connect](https://notro.mosugi.com/)

## Features

### 🚀 Content-First

Create content and build a website with Notion’s user-friendly interface. No coding knowledge required.

### ⚡️ High Performance

Websites are output as static HTML by Astro, making them extremely fast and optimized for SEO. Whether for personal blogs or business purposes, it offers a great experience.

### 📷 Image Optimization

Images used in Notion are delivered in WebP format, optimized for each device by Astro Assets.

### 🎨 Modern Styling

Integrated with TailwindCSS, it allows you to easily create modern and responsive sites.

### 📚 Templates & Free Format

Generate websites from database templates or create from specific pages in a free format.

### 🔧 Advanced Customization

In addition to changing pre-defined CSS in tailwind.css, you can apply utilities directly in Notion, defining the appearance close to the content. HTML can also be written for advanced customization.

[Check out NotroTail's style on Tailwind Play](https://play.tailwindcss.com/RY0CPlb2r9)

[Check out NotroTail's Collection style on Tailwind Play](https://play.tailwindcss.com/eac1s7OY4c)

## Installation Instructions

For running locally or in an environment without Notro Connect.

### 1. Create a Notion Internal Integration

Create an integration from [here](https://developers.notion.com/docs/create-a-notion-integration##step-1-create-an-integration) and record the **Internal Integration Token** as `NOTION_TOKEN`.

### 2. Select or Create a Notion Page

Choose an existing Notion page or duplicate a template. NotroTail works with any Notion page, but using a template provides rich features like headers and blogs.

### 3. Identify the Notion ID

Record the ID part of the URL as `NOTION_ID`.

```plaintext
https://www.notion.so/myworkspace/a8aec43384f447ed84390e8e42c2e089?v=...
                                 |---------- NOTION_ID ----------|
```

### 4. Configure Integration

Share the page with your integration following the steps [here](https://developers.notion.com/docs/create-a-notion-integration##step-2-share-a-database-with-your-integration).

### 5. Set Environment Variables

```bash
NOTION_ID=<NOTION_ID>
NOTION_SECRET=<NOTION_TOKEN>
```

### 6. Launch

NotroTail needs Astro 5.0 and Node.js 22 or later

```bash

Install dependencies

```bash
npm install
```

Run the development server

```bash
npm run dev
```

Open [http://localhost:4321](http://localhost:4321/) in your browser.

## Contributing

Please create an issue for bug reports or feature requests. Any feedback is welcome in any language. Pull requests are also appreciated.

## Roadmap

[See the Github Projects roadmap](https://github.com/users/mosugi/projects/4)

## Special Thanks

NotroTail was inspired by the following repositories:

- [Next.js Notion Starter Kit](https://github.com/transitive-bullshit/nextjs-notion-starter-kit)
    - Used for creating a website based on Notion for the first time.
- [Astro Notion Blog](https://github.com/otoyo/astro-notion-blog)
    - Used for creating a blog based on Astro.
- [AstroWind](https://github.com/onwidget/astrowind)
    - Used as a design reference.
