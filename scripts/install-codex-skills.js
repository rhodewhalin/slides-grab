#!/usr/bin/env node

import { cp, mkdir, readdir, rm, access } from 'node:fs/promises';
import { constants as fsConstants } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { homedir } from 'node:os';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const packageRoot = resolve(__dirname, '..');
const sourceRoot = join(packageRoot, 'skills');

function parseArgs(argv) {
  const opts = {
    force: false,
    dryRun: false,
  };

  for (const arg of argv) {
    if (arg === '--force') {
      opts.force = true;
      continue;
    }
    if (arg === '--dry-run') {
      opts.dryRun = true;
      continue;
    }
    if (arg === '-h' || arg === '--help') {
      opts.help = true;
      continue;
    }
    throw new Error(`Unknown option: ${arg}`);
  }

  return opts;
}

async function pathExists(path) {
  try {
    await access(path, fsConstants.F_OK);
    return true;
  } catch {
    return false;
  }
}

function usage() {
  process.stdout.write('Usage: node scripts/install-codex-skills.js [--force] [--dry-run]\n');
}

async function listSkillDirs() {
  const entries = await readdir(sourceRoot, { withFileTypes: true });
  const names = [];

  for (const entry of entries) {
    if (!entry.isDirectory()) continue;
    const skillPath = join(sourceRoot, entry.name, 'SKILL.md');
    if (await pathExists(skillPath)) {
      names.push(entry.name);
    }
  }

  return names.sort((a, b) => a.localeCompare(b));
}

async function main() {
  const opts = parseArgs(process.argv.slice(2));
  if (opts.help) {
    usage();
    return;
  }

  const codexHome = process.env.CODEX_HOME || join(homedir(), '.codex');
  const targetRoot = join(codexHome, 'skills');

  const skillDirs = await listSkillDirs();
  if (skillDirs.length === 0) {
    process.stdout.write('[codex-skills] No skills found under ./skills\n');
    return;
  }

  process.stdout.write(`[codex-skills] Source: ${sourceRoot}\n`);
  process.stdout.write(`[codex-skills] Target: ${targetRoot}\n`);

  if (opts.dryRun) {
    for (const name of skillDirs) {
      process.stdout.write(`[dry-run] would install: ${name}\n`);
    }
    return;
  }

  await mkdir(targetRoot, { recursive: true });

  for (const name of skillDirs) {
    const src = join(sourceRoot, name);
    const dest = join(targetRoot, name);

    const exists = await pathExists(dest);
    if (exists && !opts.force) {
      process.stdout.write(`[skip] ${name} already exists (use --force to overwrite)\n`);
      continue;
    }

    if (exists && opts.force) {
      await rm(dest, { recursive: true, force: true });
    }

    await cp(src, dest, { recursive: true });
    process.stdout.write(`[install] ${name}\n`);
  }

  process.stdout.write('[codex-skills] Done. Restart Codex to pick up new skills.\n');
}

main().catch((error) => {
  process.stderr.write(`[codex-skills] ${error.message}\n`);
  process.exit(1);
});
