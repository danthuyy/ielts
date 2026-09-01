#!/usr/bin/env node
/**
 * Download and shrink a pronunciation clip for every word in the lessons.
 *
 * Why ship the audio instead of streaming it: on some devices (a Samsung tablet
 * this was written for) requests to the public dictionary endpoints simply hang
 * — no response, no error — so pronunciation never plays and there is nothing
 * the app can do about it at runtime. Files served from the app's own origin
 * cannot hang that way, work offline, and can be decoded through Web Audio, the
 * one playback path that device is known to handle.
 *
 * Run after adding a lesson:  npm run build:audio
 * Existing files are kept, so it only fetches what is new.
 */
import { execFile } from 'node:child_process';
import { readFile, readdir, mkdir, writeFile, stat, rm } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { promisify } from 'node:util';

const run = promisify(execFile);
const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const lessonsDir = join(root, 'content', 'lessons');
const outDir = join(root, 'public', 'audio');

/** Mono, low bitrate: a single spoken word needs no more, and size ships. */
const FFMPEG_ARGS = ['-ac', '1', '-ar', '22050', '-b:a', '32k'];
const CONCURRENCY = 24;
/** Anything smaller is an error page rather than speech. */
const MIN_BYTES = 1500;

function sources(word) {
  const q = encodeURIComponent(word);
  return [
    `https://dict.youdao.com/dictvoice?type=1&audio=${q}`,
    `https://ssl.gstatic.com/dictionary/static/sounds/20220808/${q}--_gb_1.mp3`,
    `https://translate.googleapis.com/translate_tts?ie=UTF-8&client=gtx&tl=en&q=${q}`,
  ];
}

/**
 * Words to ship regardless of the lessons. "happiness" is what the sound check
 * in Settings speaks, so it must always have a clip — otherwise the check
 * reports a missing file on a perfectly healthy device.
 */
const ALWAYS = ['happiness'];

async function collectWords() {
  const files = (await readdir(lessonsDir)).filter((name) => name.endsWith('.json'));
  const words = new Set(ALWAYS);
  for (const file of files) {
    const lesson = JSON.parse(await readFile(join(lessonsDir, file), 'utf8'));
    for (const entry of lesson.words ?? []) {
      const word = String(entry.word ?? '').trim();
      if (word) words.add(word.toLowerCase());
    }
  }
  return [...words].sort();
}

/** The on-disk name for a word — kept in sync with audioFileFor() in tts.ts. */
export function slugFor(word) {
  return word
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

async function exists(path) {
  try {
    const info = await stat(path);
    return info.size > MIN_BYTES;
  } catch {
    return false;
  }
}

async function fetchClip(word) {
  for (const url of sources(word)) {
    try {
      const response = await fetch(url, {
        headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' },
        signal: AbortSignal.timeout(15000),
      });
      if (!response.ok) continue;
      const type = response.headers.get('content-type') ?? '';
      if (!type.includes('audio')) continue;
      const bytes = Buffer.from(await response.arrayBuffer());
      if (bytes.length > MIN_BYTES) return bytes;
    } catch {
      // Try the next source.
    }
  }
  return null;
}

async function build() {
  await mkdir(outDir, { recursive: true });
  const words = await collectWords();
  console.log(`${words.length} từ trong bài học.`);

  let done = 0;
  let added = 0;
  let missing = [];

  const worker = async (word) => {
    const target = join(outDir, `${slugFor(word)}.mp3`);
    if (await exists(target)) {
      done += 1;
      return;
    }
    const raw = await fetchClip(word);
    if (!raw) {
      missing.push(word);
      done += 1;
      return;
    }
    const temp = `${target}.raw`;
    await writeFile(temp, raw);
    try {
      await run('ffmpeg', ['-y', '-loglevel', 'error', '-i', temp, ...FFMPEG_ARGS, target]);
      added += 1;
    } catch {
      // No ffmpeg, or a clip it cannot read: ship the original rather than none.
      await writeFile(target, raw);
      added += 1;
    } finally {
      await rm(temp, { force: true });
    }
    done += 1;
    if (done % 50 === 0) console.log(`  ${done}/${words.length}...`);
  };

  for (let i = 0; i < words.length; i += CONCURRENCY) {
    await Promise.all(words.slice(i, i + CONCURRENCY).map(worker));
  }

  console.log(`Xong: thêm ${added} file, tổng ${words.length - missing.length}/${words.length}.`);
  if (missing.length > 0) {
    console.log(`Không tải được ${missing.length} từ (app sẽ đọc bằng giọng máy/mạng):`);
    console.log('  ' + missing.slice(0, 40).join(', ') + (missing.length > 40 ? ' ...' : ''));
  }
}

build().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
