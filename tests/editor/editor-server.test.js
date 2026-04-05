import assert from 'node:assert/strict';
import test from 'node:test';
import { mkdtemp, mkdir, writeFile, rm } from 'node:fs/promises';
import os from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawn } from 'node:child_process';
import { getAvailablePort } from './test-server-helpers.js';

const REPO_ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..');

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function createWorkspace() {
  const workspace = await mkdtemp(join(os.tmpdir(), 'editor-server-test-'));
  const slidesDir = join(workspace, 'slides');
  await mkdir(slidesDir, { recursive: true });
  await writeFile(join(slidesDir, 'slide-01.html'), '<!doctype html><html><body><div><h1>Test</h1><p>Slide</p></div></body></html>', 'utf8');
  return workspace;
}

function spawnEditorServer(workspace, port) {
  const output = { value: '' };
  const child = spawn(process.execPath, [join(REPO_ROOT, 'scripts', 'editor-server.js'), '--port', String(port)], {
    cwd: workspace,
    env: {
      ...process.env,
      PPT_AGENT_PACKAGE_ROOT: REPO_ROOT,
    },
    stdio: ['ignore', 'pipe', 'pipe'],
  });

  child.stdout.on('data', (chunk) => {
    output.value += chunk.toString();
  });
  child.stderr.on('data', (chunk) => {
    output.value += chunk.toString();
  });

  return { child, output };
}

async function waitForServerReady(port, child, outputRef) {
  const started = Date.now();
  while (Date.now() - started < 15000) {
    if (child.exitCode !== null) {
      throw new Error(`server exited early: ${child.exitCode}\n${outputRef.value}`);
    }

    try {
      const res = await fetch(`http://localhost:${port}/api/slides`);
      if (res.ok) {
        return;
      }
    } catch {
      // retry
    }

    await sleep(150);
  }

  throw new Error(`server did not become ready\n${outputRef.value}`);
}

async function waitForExit(child, timeoutMs = 5000) {
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      child.kill('SIGTERM');
      reject(new Error(`process did not exit within ${timeoutMs}ms`));
    }, timeoutMs);

    child.once('exit', (code, signal) => {
      clearTimeout(timeout);
      resolve({ code, signal });
    });

    child.once('error', (error) => {
      clearTimeout(timeout);
      reject(error);
    });
  });
}

async function stopChild(child) {
  if (child.exitCode !== null) {
    return;
  }

  child.kill('SIGTERM');
  await waitForExit(child, 5000).catch(() => {});
}

test('refuses to open a second editor when another slides-grab editor already owns the port', async () => {
  const workspace = await createWorkspace();
  const port = await getAvailablePort();
  const first = spawnEditorServer(workspace, port);

  try {
    await waitForServerReady(port, first.child, first.output);

    const second = spawnEditorServer(workspace, port);
    try {
      const { code, signal } = await waitForExit(second.child);
      assert.equal(signal, null);
      assert.equal(code, 1);
      assert.match(second.output.value, new RegExp(`editor port ${port} is already in use`, 'i'));
      assert.match(second.output.value, /choose another port/i);
    } finally {
      await stopChild(second.child);
    }

    const res = await fetch(`http://localhost:${port}/api/slides`);
    assert.equal(res.ok, true, `first editor should still be serving slides\n${first.output.value}`);
  } finally {
    await stopChild(first.child);
    await rm(workspace, { recursive: true, force: true });
  }
});
