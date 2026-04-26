#!/usr/bin/env node
/**
 * notro-ui CLI
 *
 * Usage:
 *   notro-ui init                              Initialize project (creates notro.json, copies theme.css)
 *   notro-ui add [components...] [--all] [-y]  Add components (skips existing files)
 *   notro-ui update [components...] [--all] [-y]  Update components (overwrites local changes)
 *   notro-ui remove [components...] [--all]    Remove components
 *   notro-ui list [--installed]                List available or installed components
 *
 * Examples:
 *   notro-ui init
 *   notro-ui add callout toggle
 *   notro-ui add --all
 *   notro-ui update callout --yes
 *   notro-ui update --all --yes
 *   notro-ui remove callout
 *   notro-ui list
 *   notro-ui list --installed
 */

import { fileURLToPath } from 'node:url';
import { dirname, join, resolve, relative } from 'node:path';
import {
  copyFileSync,
  mkdirSync,
  existsSync,
  readFileSync,
  writeFileSync,
  unlinkSync,
} from 'node:fs';
import readline from 'node:readline';

const __dirname = dirname(fileURLToPath(import.meta.url));
const TEMPLATES_DIR = resolve(__dirname, '..', 'src', 'templates');

// ── ANSI color helpers ────────────────────────────────────────────────────────

const c = {
  reset:  '\x1b[0m',
  bold:   '\x1b[1m',
  green:  '\x1b[32m',
  yellow: '\x1b[33m',
  red:    '\x1b[31m',
  gray:   '\x1b[90m',
  cyan:   '\x1b[36m',
};

const green  = (s) => `${c.green}${s}${c.reset}`;
const yellow = (s) => `${c.yellow}${s}${c.reset}`;
const red    = (s) => `${c.red}${s}${c.reset}`;
const gray   = (s) => `${c.gray}${s}${c.reset}`;
const bold   = (s) => `${c.bold}${s}${c.reset}`;
const cyan   = (s) => `${c.cyan}${s}${c.reset}`;

// ── Component registry ────────────────────────────────────────────────────────

/** Named component groups: each key is the user-facing component name. */
const COMPONENT_MAP = {
  callout:          ['Callout.astro'],
  toggle:           ['Toggle.astro', 'ToggleTitle.astro'],
  columns:          ['Columns.astro', 'Column.astro'],
  audio:            ['Audio.astro'],
  video:            ['Video.astro'],
  file:             ['FileBlock.astro'],
  pdf:              ['PdfBlock.astro'],
  pageref:          ['PageRef.astro'],
  databaseref:      ['DatabaseRef.astro'],
  tableofcontents:  ['TableOfContents.astro'],
  emptyblock:       ['EmptyBlock.astro'],
  mention:          ['Mention.astro', 'MentionDate.astro'],
  h1:               ['H1.astro'],
  h2:               ['H2.astro'],
  h3:               ['H3.astro'],
  h4:               ['H4.astro'],
  quote:            ['Quote.astro'],
  styledspan:       ['StyledSpan.astro'],
  image:            ['ImageBlock.astro'],
  table:            ['TableBlock.astro', 'TableHead.astro', 'TableBody.astro', 'TableColgroup.astro', 'TableCol.astro', 'TableRow.astro', 'TableHeaderCell.astro', 'TableCell.astro'],
  coloredparagraph: ['ColoredParagraph.astro'],
  syncedblock:      ['SyncedBlock.astro'],
};

/** Core files always present — installed alongside components (not user-selectable). */
const CORE_FILES = ['colors.ts', 'index.ts'];

const COMPONENT_NAMES = Object.keys(COMPONENT_MAP);

// ── Config (notro.json) ───────────────────────────────────────────────────────

const CONFIG_FILE = 'notro.json';
const DEFAULT_OUT_DIR    = 'src/components/notro';
const DEFAULT_STYLES_DIR = 'src/styles';

function configPath(cwd) {
  return join(cwd, CONFIG_FILE);
}

function readConfig(cwd) {
  const p = configPath(cwd);
  if (!existsSync(p)) return null;
  try {
    return JSON.parse(readFileSync(p, 'utf8'));
  } catch {
    console.error(red(`Error: failed to parse ${CONFIG_FILE}`));
    process.exit(1);
  }
}

function writeConfig(cwd, config) {
  writeFileSync(configPath(cwd), JSON.stringify(config, null, 2) + '\n');
}

function requireConfig(cwd) {
  const cfg = readConfig(cwd);
  if (!cfg) {
    console.error(red(`Error: ${CONFIG_FILE} not found.`));
    console.error(gray(`  Run ${bold('notro-ui init')} first.`));
    process.exit(1);
  }
  return cfg;
}

// ── File system helpers ───────────────────────────────────────────────────────

function ensureDir(dir) {
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
  }
}

/**
 * Copy a single template file to destDir.
 * @param {string} filename
 * @param {string} destDir
 * @param {'skip'|'overwrite'} strategy - 'skip' leaves existing files untouched
 * @returns {'added'|'updated'|'skipped'}
 */
function copyTemplate(filename, destDir, strategy) {
  const src  = join(TEMPLATES_DIR, filename);
  const dest = join(destDir, filename);
  if (existsSync(dest)) {
    if (strategy === 'skip') return 'skipped';
    copyFileSync(src, dest);
    return 'updated';
  }
  copyFileSync(src, dest);
  return 'added';
}

function displayPath(absPath, cwd) {
  return relative(cwd, absPath);
}

// ── Confirmation prompt ───────────────────────────────────────────────────────

function confirm(message) {
  return new Promise((resolve) => {
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
    rl.question(`${message} ${gray('(y/N)')} `, (answer) => {
      rl.close();
      resolve(answer.toLowerCase() === 'y');
    });
  });
}

// ── Resolve component names → file lists ─────────────────────────────────────

function resolveFiles(names) {
  const unknown = names.filter((n) => !COMPONENT_MAP[n]);
  if (unknown.length > 0) {
    console.error(red(`Error: unknown component(s): ${unknown.join(', ')}`));
    console.error(gray(`  Run ${bold('notro-ui list')} to see available components.`));
    process.exit(1);
  }
  return names.flatMap((n) => COMPONENT_MAP[n]);
}

// ── Commands ──────────────────────────────────────────────────────────────────

function initCommand() {
  const cwd = process.cwd();

  console.log(`\n${bold('notro-ui init')}\n`);

  // Write notro.json if it doesn't exist
  const cfgFile = configPath(cwd);
  if (existsSync(cfgFile)) {
    console.log(yellow(`  ${CONFIG_FILE} already exists — skipping config creation.`));
  } else {
    const config = {
      outDir:     DEFAULT_OUT_DIR,
      stylesDir:  DEFAULT_STYLES_DIR,
      components: [],
    };
    writeConfig(cwd, config);
    console.log(green(`  Created  ${CONFIG_FILE}`));
  }

  // Copy theme.css → src/styles/notro-theme.css (skip if already present)
  const cfg       = readConfig(cwd);
  const stylesDir = resolve(cwd, cfg?.stylesDir ?? DEFAULT_STYLES_DIR);
  ensureDir(stylesDir);
  const themeSrc  = join(TEMPLATES_DIR, 'theme.css');
  const themeDest = join(stylesDir, 'notro-theme.css');
  if (existsSync(themeDest)) {
    console.log(gray(`  Skipped  ${displayPath(themeDest, cwd)}  (already exists)`));
  } else {
    copyFileSync(themeSrc, themeDest);
    console.log(green(`  Added    ${displayPath(themeDest, cwd)}`));
  }

  console.log(`
${bold('Next steps:')}
  1. Add to your CSS (e.g. ${cyan('src/styles/global.css')}):
       ${gray('@import "./notro-theme.css";')}

  2. Add components:
       ${cyan('notro-ui add --all')}

  3. Import in your page:
       ${gray('import { NotroContent } from "notro-loader";')}
       ${gray('import { notroComponents } from "@/components/notro";')}
       ${gray('<NotroContent markdown={markdown} {linkToPages} components={notroComponents} />')}
`);
}

async function addCommand(names, flags) {
  const cwd = process.cwd();
  const cfg = requireConfig(cwd);

  const outDir = resolve(cwd, cfg.outDir ?? DEFAULT_OUT_DIR);
  ensureDir(outDir);

  const useAll = flags.all;
  const targets = useAll ? COMPONENT_NAMES : names;

  if (targets.length === 0) {
    console.error(red('Error: specify component name(s) or use --all.'));
    console.error(gray(`  Example: ${bold('notro-ui add callout toggle')}`));
    console.error(gray(`           ${bold('notro-ui add --all')}`));
    process.exit(1);
  }

  const files = resolveFiles(targets);

  console.log(`\n${bold('notro-ui add')}\n`);

  // Install core files (skip if present)
  for (const f of CORE_FILES) {
    const result = copyTemplate(f, outDir, 'skip');
    const dest   = displayPath(join(outDir, f), cwd);
    if (result === 'skipped') {
      console.log(gray(`  Skipped  ${dest}  (already exists)`));
    } else {
      console.log(green(`  Added    ${dest}`));
    }
  }

  // Install component files (skip if present)
  let addedCount   = 0;
  let skippedCount = 0;
  for (const f of files) {
    const result = copyTemplate(f, outDir, 'skip');
    const dest   = displayPath(join(outDir, f), cwd);
    if (result === 'skipped') {
      console.log(gray(`  Skipped  ${dest}  (already exists)`));
      skippedCount++;
    } else {
      console.log(green(`  Added    ${dest}`));
      addedCount++;
    }
  }

  // Update notro.json components list (add new entries)
  const existing = new Set(cfg.components ?? []);
  for (const name of targets) existing.add(name);
  cfg.components = [...existing].sort();
  writeConfig(cwd, cfg);
  console.log(green(`  Updated  ${CONFIG_FILE}`));

  console.log(`\n${green('Done!')}  ${addedCount} added, ${skippedCount} skipped.\n`);
}

async function updateCommand(names, flags) {
  const cwd = process.cwd();
  const cfg = requireConfig(cwd);

  const outDir = resolve(cwd, cfg.outDir ?? DEFAULT_OUT_DIR);
  const useAll = flags.all;
  const useYes = flags.yes;

  let targets;
  if (useAll) {
    targets = cfg.components ?? [];
    if (targets.length === 0) {
      console.error(yellow('No components installed yet. Run notro-ui add --all first.'));
      process.exit(0);
    }
  } else {
    targets = names;
    if (targets.length === 0) {
      console.error(red('Error: specify component name(s) or use --all.'));
      console.error(gray(`  Example: ${bold('notro-ui update callout')}`));
      console.error(gray(`           ${bold('notro-ui update --all --yes')}`));
      process.exit(1);
    }
  }

  const files = resolveFiles(targets);

  console.log(`\n${bold('notro-ui update')}\n`);
  console.log(yellow('  Warning: this will overwrite your local changes to these components.'));
  console.log(gray(`  Components: ${targets.join(', ')}\n`));

  if (!useYes) {
    const ok = await confirm('  Continue?');
    if (!ok) {
      console.log(gray('\n  Aborted.\n'));
      process.exit(0);
    }
    console.log();
  }

  // Update core files
  for (const f of CORE_FILES) {
    const result = copyTemplate(f, outDir, 'overwrite');
    const dest   = displayPath(join(outDir, f), cwd);
    console.log(green(`  Updated  ${dest}`));
  }

  // Update component files
  let updatedCount = 0;
  for (const f of files) {
    const result = copyTemplate(f, outDir, 'overwrite');
    const dest   = displayPath(join(outDir, f), cwd);
    console.log(green(`  Updated  ${dest}`));
    updatedCount++;
  }

  console.log(`\n${green('Done!')}  ${updatedCount} file(s) updated.\n`);
}

function removeCommand(names, flags) {
  const cwd = process.cwd();
  const cfg = requireConfig(cwd);

  const outDir = resolve(cwd, cfg.outDir ?? DEFAULT_OUT_DIR);
  const useAll = flags.all;

  const targets = useAll ? (cfg.components ?? []) : names;

  if (targets.length === 0) {
    console.error(red('Error: specify component name(s) or use --all.'));
    process.exit(1);
  }

  // Validate names first
  resolveFiles(targets);

  console.log(`\n${bold('notro-ui remove')}\n`);

  let removedCount = 0;
  for (const name of targets) {
    for (const f of COMPONENT_MAP[name]) {
      const dest = join(outDir, f);
      if (existsSync(dest)) {
        unlinkSync(dest);
        console.log(green(`  Removed  ${displayPath(dest, cwd)}`));
        removedCount++;
      } else {
        console.log(gray(`  Missing  ${displayPath(dest, cwd)}  (already removed)`));
      }
    }
  }

  // Update notro.json
  cfg.components = (cfg.components ?? []).filter((n) => !targets.includes(n));
  writeConfig(cwd, cfg);
  console.log(green(`  Updated  ${CONFIG_FILE}`));

  console.log(`\n${green('Done!')}  ${removedCount} file(s) removed.\n`);
}

function listCommand(flags) {
  const cwd = process.cwd();

  if (flags.installed) {
    const cfg = readConfig(cwd);
    const installed = cfg?.components ?? [];
    if (installed.length === 0) {
      console.log(gray('\n  No components installed. Run notro-ui add --all to get started.\n'));
      return;
    }
    console.log(`\n${bold('Installed components:')}\n`);
    for (const name of installed) {
      const files = COMPONENT_MAP[name] ?? [];
      console.log(`  ${green(name.padEnd(20))} ${gray(files.join(', '))}`);
    }
    console.log();
  } else {
    console.log(`\n${bold('Available components:')}\n`);
    for (const [name, files] of Object.entries(COMPONENT_MAP)) {
      console.log(`  ${cyan(name.padEnd(20))} ${gray(files.join(', '))}`);
    }
    console.log();
  }
}

function printHelp() {
  console.log(`
${bold('notro-ui')} — Notion block component installer

${bold('Usage:')}
  notro-ui ${cyan('init')}                               Initialize project (creates notro.json)
  notro-ui ${cyan('add')} [components...] [--all] [-y]   Add components ${gray('(skips existing)')}
  notro-ui ${cyan('update')} [components...] [--all] [-y] Update components ${yellow('(overwrites local changes)')}
  notro-ui ${cyan('remove')} [components...] [--all]     Remove components
  notro-ui ${cyan('list')} [--installed]                 List available or installed components

${bold('Options:')}
  -a, --all     Target all components
  -y, --yes     Skip confirmation prompts

${bold('Examples:')}
  notro-ui init
  notro-ui add callout toggle
  notro-ui add --all
  notro-ui update --all --yes
  notro-ui remove callout
  notro-ui list
  notro-ui list --installed
`);
}

// ── Argument parser ───────────────────────────────────────────────────────────

function parseArgs(argv) {
  const flags = { all: false, yes: false, installed: false };
  const names = [];
  for (const arg of argv) {
    if (arg === '--all' || arg === '-a')       flags.all       = true;
    else if (arg === '--yes' || arg === '-y')  flags.yes       = true;
    else if (arg === '--installed')            flags.installed = true;
    else if (!arg.startsWith('-'))             names.push(arg.toLowerCase());
  }
  return { flags, names };
}

// ── Main ──────────────────────────────────────────────────────────────────────

const [, , command, ...rawArgs] = process.argv;
const { flags, names } = parseArgs(rawArgs);

switch (command) {
  case 'init':
    initCommand();
    break;
  case 'add':
    await addCommand(names, flags);
    break;
  case 'update':
    await updateCommand(names, flags);
    break;
  case 'remove':
    removeCommand(names, flags);
    break;
  case 'list':
    listCommand(flags);
    break;
  default:
    printHelp();
}
