#!/usr/bin/env node
/**
 * Validates every file in content/lessons against the app's own schema.
 *
 * Runs in CI and as part of `npm run build`, so a malformed lesson fails the
 * pipeline with a readable message instead of blanking the app at runtime.
 *
 * The schema is imported straight from src/content/schema.ts (Node >= 22.18
 * strips the types natively) — there is deliberately no second copy of the
 * rules to drift out of sync.
 */
import { readdir, readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

import { lessonSchema } from '../src/content/schema.ts';
import { grammarSchema } from '../src/content/grammarSchema.ts';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const LESSONS_DIR = path.join(ROOT, 'content', 'lessons');
const GRAMMAR_DIR = path.join(ROOT, 'content', 'grammar');

function formatIssues(issues) {
  return issues
    .map((issue) => `    ${issue.path.join('.') || '(root)'}: ${issue.message}`)
    .join('\n');
}

async function main() {
  let files;
  try {
    files = (await readdir(LESSONS_DIR)).filter((name) => name.endsWith('.json')).sort();
  } catch {
    console.error(`Không tìm thấy thư mục ${path.relative(ROOT, LESSONS_DIR)}`);
    process.exit(1);
  }

  if (files.length === 0) {
    console.error('content/lessons rỗng — cần ít nhất một bài học.');
    process.exit(1);
  }

  const errors = [];
  const seenIds = new Map();
  let wordCount = 0;

  for (const file of files) {
    const relative = `content/lessons/${file}`;

    let raw;
    try {
      raw = JSON.parse(await readFile(path.join(LESSONS_DIR, file), 'utf8'));
    } catch (err) {
      errors.push(`${relative}\n    JSON không hợp lệ: ${err.message}`);
      continue;
    }

    const result = lessonSchema.safeParse(raw);
    if (!result.success) {
      errors.push(`${relative}\n${formatIssues(result.error.issues)}`);
      continue;
    }

    const lesson = result.data;

    const expectedId = file.replace(/\.json$/, '');
    if (lesson.id !== expectedId) {
      errors.push(
        `${relative}\n    id "${lesson.id}" không trùng tên file (phải là "${expectedId}")`,
      );
      continue;
    }

    const duplicate = seenIds.get(lesson.id);
    if (duplicate) {
      errors.push(`${relative}\n    id "${lesson.id}" đã được dùng ở ${duplicate}`);
      continue;
    }
    seenIds.set(lesson.id, relative);

    wordCount += lesson.words.length;
    console.log(`  ok   ${relative.padEnd(46)}${String(lesson.words.length).padStart(3)} từ`);
  }

  if (errors.length > 0) {
    console.error(`\n${errors.length} bài học không hợp lệ:\n`);
    for (const error of errors) console.error(`  ${error}\n`);
    process.exit(1);
  }

  console.log(`\n${files.length} bài học · ${wordCount} từ — tất cả hợp lệ.`);

  await checkGrammar();
}

/**
 * The grammar files go through the same gate. They are a separate content type
 * with their own schema, and a broken drill — a missing blank, an answer that is
 * not among the choices — would otherwise only surface mid-exercise.
 */
async function checkGrammar() {
  let files;
  try {
    files = (await readdir(GRAMMAR_DIR)).filter((name) => name.endsWith('.json')).sort();
  } catch {
    return; // No grammar directory is fine; the app renders an empty track.
  }
  if (files.length === 0) return;

  const errors = [];
  const seenOrder = new Map();
  let drillCount = 0;

  for (const file of files) {
    const relative = `content/grammar/${file}`;
    let raw;
    try {
      raw = JSON.parse(await readFile(path.join(GRAMMAR_DIR, file), 'utf8'));
    } catch (err) {
      errors.push(`${relative}
    JSON không hợp lệ: ${err.message}`);
      continue;
    }

    const result = grammarSchema.safeParse(raw);
    if (!result.success) {
      errors.push(`${relative}
${formatIssues(result.error.issues)}`);
      continue;
    }

    const lesson = result.data;
    if (lesson.id !== file.replace('.json', '')) {
      errors.push(`${relative}
    id "${lesson.id}" phải trùng tên file`);
      continue;
    }
    const clash = seenOrder.get(lesson.order);
    if (clash) {
      errors.push(`${relative}
    order ${lesson.order} đã được dùng ở ${clash}`);
      continue;
    }
    seenOrder.set(lesson.order, relative);

    drillCount += lesson.drills.length;
    console.log(`  ok   ${relative.padEnd(46)}${String(lesson.drills.length).padStart(3)} câu`);
  }

  if (errors.length > 0) {
    console.error(`
${errors.length} bài ngữ pháp không hợp lệ:
`);
    for (const error of errors) console.error(`  ${error}
`);
    process.exit(1);
  }

  console.log(`${files.length} bài ngữ pháp · ${drillCount} câu bài tập — tất cả hợp lệ.`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
