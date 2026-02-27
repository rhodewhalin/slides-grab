#!/usr/bin/env node

import { readdir, writeFile } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { chromium } from 'playwright';
import { PDFDocument } from 'pdf-lib';

const DEFAULT_OUTPUT = 'slides.pdf';
const SLIDE_FILE_PATTERN = /^slide-.*\.html$/i;
const FALLBACK_SLIDE_SIZE = { width: 960, height: 540 };

const __dirname = dirname(fileURLToPath(import.meta.url));
const SLIDES_DIR = join(__dirname, '..', 'slides');

function printUsage() {
  process.stdout.write(
    [
      'Usage: node scripts/html2pdf.js [options]',
      '',
      'Options:',
      `  --output <path>  Output PDF path (default: ${DEFAULT_OUTPUT})`,
      '  -h, --help       Show this help message',
      '',
      'Examples:',
      '  node scripts/html2pdf.js',
      '  node scripts/html2pdf.js --output dist/deck.pdf',
    ].join('\n'),
  );
  process.stdout.write('\n');
}

function readOptionValue(args, index, optionName) {
  const next = args[index + 1];
  if (!next || next.startsWith('-')) {
    throw new Error(`Missing value for ${optionName}.`);
  }
  return next;
}

function toSlideOrder(fileName) {
  const match = fileName.match(/\d+/);
  return match ? Number.parseInt(match[0], 10) : Number.POSITIVE_INFINITY;
}

export function sortSlideFiles(a, b) {
  const orderA = toSlideOrder(a);
  const orderB = toSlideOrder(b);
  if (orderA !== orderB) return orderA - orderB;
  return a.localeCompare(b);
}

export function parseCliArgs(args) {
  const options = {
    output: DEFAULT_OUTPUT,
    help: false,
  };

  for (let i = 0; i < args.length; i += 1) {
    const arg = args[i];

    if (arg === '-h' || arg === '--help') {
      options.help = true;
      continue;
    }

    if (arg === '--output') {
      options.output = readOptionValue(args, i, '--output');
      i += 1;
      continue;
    }

    if (arg.startsWith('--output=')) {
      options.output = arg.slice('--output='.length);
      continue;
    }

    throw new Error(`Unknown option: ${arg}`);
  }

  if (typeof options.output !== 'string' || options.output.trim() === '') {
    throw new Error('--output must be a non-empty string.');
  }

  options.output = options.output.trim();

  return options;
}

export async function findSlideFiles(slidesDir = SLIDES_DIR) {
  const entries = await readdir(slidesDir, { withFileTypes: true });
  return entries
    .filter((entry) => entry.isFile() && SLIDE_FILE_PATTERN.test(entry.name))
    .map((entry) => entry.name)
    .sort(sortSlideFiles);
}

function normalizeDimension(value, fallback) {
  if (!Number.isFinite(value) || value <= 0) {
    return fallback;
  }
  return Math.max(1, Math.round(value));
}

export function buildPdfOptions(widthPx, heightPx) {
  return {
    width: `${normalizeDimension(widthPx, FALLBACK_SLIDE_SIZE.width)}px`,
    height: `${normalizeDimension(heightPx, FALLBACK_SLIDE_SIZE.height)}px`,
    printBackground: true,
    pageRanges: '1',
    margin: { top: '0px', right: '0px', bottom: '0px', left: '0px' },
    preferCSSPageSize: false,
  };
}

async function getSlideSize(page) {
  const size = await page.evaluate(() => {
    const body = document.body;
    const rect = body.getBoundingClientRect();
    const style = window.getComputedStyle(body);

    return {
      width: Number.parseFloat(style.width) || rect.width || 0,
      height: Number.parseFloat(style.height) || rect.height || 0,
    };
  });

  return {
    width: normalizeDimension(size.width, FALLBACK_SLIDE_SIZE.width),
    height: normalizeDimension(size.height, FALLBACK_SLIDE_SIZE.height),
  };
}

async function renderSlideToPdf(page, slideFile) {
  const slidePath = join(SLIDES_DIR, slideFile);
  const slideUrl = pathToFileURL(slidePath).href;

  await page.goto(slideUrl, { waitUntil: 'load' });
  await page.evaluate(async () => {
    if (document.fonts?.ready) {
      await document.fonts.ready;
    }
  });

  const size = await getSlideSize(page);
  return page.pdf(buildPdfOptions(size.width, size.height));
}

export async function mergePdfBuffers(pdfBuffers) {
  const outputPdf = await PDFDocument.create();

  for (const pdfBuffer of pdfBuffers) {
    const sourcePdf = await PDFDocument.load(pdfBuffer);
    const pageIndices = sourcePdf.getPageIndices();
    const pages = await outputPdf.copyPages(sourcePdf, pageIndices);
    for (const page of pages) {
      outputPdf.addPage(page);
    }
  }

  return outputPdf.save();
}

async function main() {
  const options = parseCliArgs(process.argv.slice(2));
  if (options.help) {
    printUsage();
    return;
  }

  const slideFiles = await findSlideFiles();
  if (slideFiles.length === 0) {
    throw new Error('No slide-*.html files found in slides/');
  }

  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  const slidePdfs = [];

  try {
    for (const slideFile of slideFiles) {
      const slidePdf = await renderSlideToPdf(page, slideFile);
      slidePdfs.push(slidePdf);
    }
  } finally {
    await browser.close();
  }

  const mergedPdf = await mergePdfBuffers(slidePdfs);
  const outputPath = resolve(process.cwd(), options.output);
  await writeFile(outputPath, mergedPdf);

  process.stdout.write(`Generated PDF: ${outputPath}\n`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((error) => {
    process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
    process.exit(1);
  });
}
