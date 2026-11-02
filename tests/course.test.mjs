import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { execFileSync } from 'node:child_process';
import { loadCourse } from '../js/course-loader.js';
import { formatText, renderCodeFiles } from '../js/content-view.js';

const courseURL = new URL('../config/course.json', import.meta.url);
const config = JSON.parse(await readFile(courseURL, 'utf8'));
const chapters = await Promise.all(config.chapters.map(async path =>
  JSON.parse(await readFile(new URL(path, courseURL), 'utf8'))));

function mockFiles(t, replacements = {}) {
  t.mock.method(globalThis, 'fetch', async url => {
    const key = new URL(url).pathname.split('/').pop();
    if (Object.hasOwn(replacements, key)) {
      const body = replacements[key];
      return new Response(typeof body === 'string' ? body : JSON.stringify(body));
    }
    return new Response(await readFile(url, 'utf8'));
  });
}

test('the complete curriculum loads with preserved order and unique progress IDs', async t => {
  mockFiles(t);
  const loaded = await loadCourse(courseURL);
  assert.equal(loaded.chapters.length, 10);
  assert.deepEqual(loaded.chapters.map(chapter => chapter.week), [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
  const ids = loaded.chapters.flatMap(chapter => chapter.checklist.map(item => item.id));
  assert.equal(ids.length, 40);
  assert.equal(new Set(ids).size, ids.length);
  assert(ids.includes('w1-c1')); // Existing saved progress remains addressable.
});

test('new chapter content validates before rendering', async t => {
  const broken = structuredClone(chapters[0]);
  broken.commands[0].expected = 42;
  mockFiles(t, { '00-repository-foundations.json': broken });
  await assert.rejects(loadCourse(courseURL), /commands/);
});

test('duplicate task IDs and invalid JSON report useful errors', async t => {
  const duplicate = structuredClone(chapters[1]);
  duplicate.checklist[0].id = chapters[0].checklist[0].id;
  mockFiles(t, { '01-python-docker.json': duplicate });
  await assert.rejects(loadCourse(courseURL), /unique checklist ID/);
  t.mock.restoreAll();
  mockFiles(t, { '01-python-docker.json': '{invalid json' });
  await assert.rejects(loadCourse(courseURL), /01-python-docker.json: invalid JSON/);
});

test('all command examples are valid Bash syntax without executing them', () => {
  for (const chapter of chapters) {
    for (const item of chapter.commands) {
      assert.doesNotThrow(() => execFileSync('/bin/bash', ['-n'], {input: item.command}), `${chapter.title}: ${item.explanation}`);
    }
  }
});

test('inline teaching text and editor fallback escape markup', () => {
  const text = formatText('Use `dict[str, int]` and reject <script>alert(1)</script>.');
  assert(text.includes('dict[str, int]</code>'));
  assert(text.includes('&lt;script&gt;'));
  assert(!text.includes('<script>'));
  const editor = renderCodeFiles([{filename: 'example.py', code: '<img src=x onerror=alert(1)>', language: 'unknown'}]);
  assert(editor.includes('&lt;img'));
  assert(!editor.includes('<img'));
});

test('shared code examples agree and obsolete Python entry points are absent', () => {
  const seen = new Map();
  for (const chapter of chapters) {
    assert(chapter.objectives.length >= 4);
    assert(chapter.lessons.length >= 3);
    assert(chapter.flowDiagram.includes('<svg'));
    assert(chapter.svgDiagram.includes('<svg'));
    for (const file of chapter.codeFiles) {
      if (seen.has(file.filename)) assert.equal(file.code, seen.get(file.filename), file.filename);
      seen.set(file.filename, file.code);
      assert(!file.code.includes('@app.on_event('));
      assert(!file.code.includes('pip install'));
    }
  }
  assert(seen.get('Dockerfile').includes('uv sync --locked --no-dev'));
  assert(seen.get('app/main.py').includes('lifespan=lifespan'));
  assert(seen.get('app/broker.py').includes('RedisStreamBroker'));
});
