#!/usr/bin/env node
/**
 * One-off importer for the foundation track.
 *
 * The four source files each hold five lessons separated by `## N. Tên bài`.
 * This splits them into one file per lesson, imports each, and marks the whole
 * track visible only to the two school learners — the IELTS build has no use
 * for "Bảng chữ cái và âm cơ bản" cluttering its lesson list.
 */
import { execFileSync } from 'node:child_process';
import { readFileSync, writeFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

const SOURCES = ['basic_a.md', 'basic_b.md', 'basic_c.md', 'basic_d.md'];
const AUDIENCE = ['pboiboi', 'pdondong'];
const dir = join('content', 'sources');

const lessons = [];
for (const file of SOURCES) {
  const text = readFileSync(join(dir, file), 'utf8');
  for (const part of text.split(/^##\s+/m).slice(1)) {
    const [head, ...rest] = part.split('\n');
    const match = /^(\d+)\.\s*(.+)$/.exec(head.trim());
    if (!match) {
      console.log('BỎ QUA tiêu đề lạ:', head.slice(0, 60));
      continue;
    }
    const num = Number(match[1]);
    const name = match[2].trim();
    const slug = `basic_${String(num).padStart(2, '0')}`;
    const path = join(dir, `${slug}.md`);
    writeFileSync(path, `## ${num}. ${name}\n\n${rest.join('\n').trim()}\n`);
    lessons.push({ slug, num, name, path });
  }
}

lessons.sort((a, b) => a.num - b.num);
let ok = 0;
const failed = [];
for (const lesson of lessons) {
  // Zero-padded in the title so the twenty sort in teaching order, not 1, 10, 11.
  const title = `Nền tảng ${String(lesson.num).padStart(2, '0')} — ${lesson.name}`;
  try {
    execFileSync(
      process.execPath,
      [
        'scripts/import-lesson.mjs',
        '--from',
        lesson.path,
        '--id',
        lesson.slug,
        '--title',
        title,
        '--tags',
        'basics,school',
      ],
      { stdio: 'pipe' },
    );
    ok += 1;
  } catch (error) {
    failed.push(`${lesson.slug}: ${String(error.stdout ?? error.message).slice(-200)}`);
  }
}

for (const file of readdirSync('content/lessons')) {
  if (!/^basic_\d+\.json$/.test(file)) continue;
  const path = join('content', 'lessons', file);
  const data = JSON.parse(readFileSync(path, 'utf8'));
  const { id, title, date, tags, words, ...rest } = data;
  writeFileSync(
    path,
    `${JSON.stringify({ id, title, date, tags, audience: AUDIENCE, ...rest, words }, null, 2)}\n`,
  );
}

console.log(`nhập được ${ok}/${lessons.length} bài nền tảng`);
if (failed.length > 0) console.log(`LỖI:\n${failed.join('\n')}`);
