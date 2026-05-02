#!/usr/bin/env node
import * as p from "@clack/prompts";
import { downloadTemplate } from "giget";
import { execSync } from "node:child_process";
import { existsSync, copyFileSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import pc from "picocolors";

// Detect which package manager invoked this CLI
function detectPackageManager(): "npm" | "pnpm" | "yarn" | "bun" {
  const ua = process.env.npm_config_user_agent ?? "";
  if (ua.startsWith("pnpm")) return "pnpm";
  if (ua.startsWith("yarn")) return "yarn";
  if (ua.startsWith("bun")) return "bun";
  return "npm";
}

const TEMPLATES = {
  basics: {
    label: "A basic, helpful starter project (recommended)",
    hint: "Clean starter with post listing, individual pages, and Tailwind CSS",
  },
  blog: {
    label: "Use blog (Starwind) template",
    hint: "Full-featured blog with list, tags, pagination, RSS, and SEO",
  },
  docs: {
    label: "Use docs (Starlight) template",
    hint: "Documentation site with sidebar navigation and search",
  },
  gallery: {
    label: "Use gallery template",
    hint: "Visual gallery for showcasing images or portfolio items",
  },
  blank: {
    label: "Use minimal (empty) template",
    hint: "Bare minimum — just pages and Notion content rendering",
  },
} as const;

type TemplateName = keyof typeof TEMPLATES;

async function main() {
  console.log("");
  p.intro(pc.bgCyan(pc.black(" create-notro ")));

  // Project name
  const projectName = await p.text({
    message: "Project name",
    placeholder: "my-notro-site",
    validate(v) {
      if (!v || v.trim() === "") return "Project name is required";
      if (!/^[a-z0-9][a-z0-9-]*$/.test(v))
        return "Use only lowercase letters, numbers, and hyphens";
      if (existsSync(v)) return `Directory "${v}" already exists`;
    },
  });

  if (p.isCancel(projectName)) {
    p.cancel("Cancelled.");
    process.exit(0);
  }

  // Template selection
  const template = await p.select({
    message: "How would you like to start your new project?",
    options: (Object.entries(TEMPLATES) as [TemplateName, (typeof TEMPLATES)[TemplateName]][]).map(
      ([value, { label, hint }]) => ({ value, label, hint }),
    ),
  });

  if (p.isCancel(template)) {
    p.cancel("Cancelled.");
    process.exit(0);
  }

  const installDeps = await p.confirm({
    message: "Install dependencies now?",
    initialValue: true,
  });

  if (p.isCancel(installDeps)) {
    p.cancel("Cancelled.");
    process.exit(0);
  }

  const pm = detectPackageManager();

  // Download template
  const spin = p.spinner();
  spin.start("Downloading template…");

  try {
    await downloadTemplate(`github:mosugi/notro/templates/${template as TemplateName}`, {
      dir: projectName as string,
      forceClean: false,
    });
  } catch (err) {
    spin.stop("Download failed");
    p.log.error(String(err));
    process.exit(1);
  }

  spin.stop("Template downloaded");

  // Set project name in package.json
  const pkgPath = join(projectName as string, "package.json");
  if (existsSync(pkgPath)) {
    const pkg = JSON.parse(readFileSync(pkgPath, "utf-8"));
    pkg.name = projectName as string;
    writeFileSync(pkgPath, JSON.stringify(pkg, null, 2) + "\n");
  }

  // Copy .env.example → .env
  const envExample = join(projectName as string, ".env.example");
  const envFile = join(projectName as string, ".env");
  if (existsSync(envExample) && !existsSync(envFile)) {
    copyFileSync(envExample, envFile);
    p.log.info(".env created from .env.example — add your Notion credentials");
  }

  // Install dependencies
  if (installDeps) {
    spin.start(`Installing dependencies with ${pm}…`);
    try {
      execSync(`${pm} install`, {
        cwd: projectName as string,
        stdio: "pipe",
      });
      spin.stop("Dependencies installed");
    } catch {
      spin.stop("Dependency installation failed — run manually");
    }
  }

  const installCmd = installDeps ? "" : `\n  ${pm} install\n`;
  p.note(
    [
      `${pc.bold("1.")} Edit ${pc.cyan(`${projectName as string}/.env`)} with your Notion credentials`,
      `     NOTION_TOKEN=secret_xxx`,
      `     NOTION_DATASOURCE_ID=xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx`,
      ``,
      `${pc.bold("2.")} Start the dev server:`,
      `     cd ${projectName as string}${installCmd}`,
      `     ${pm} run dev`,
    ].join("\n"),
    "Next steps",
  );

  p.outro(
    `Documentation: ${pc.underline("https://github.com/mosugi/notro")}`,
  );
}

main().catch(console.error);
