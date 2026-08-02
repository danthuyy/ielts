#!/usr/bin/env node
/**
 * Scaffolds content/lessons/<id>.json.
 *
 *   npm run lesson:new -- --id money_and_life --title "Money and Life"
 *   npm run lesson:new -- --id money_and_life --title "Money and Life" \
 *     --tags money,society --description "Bài đọc về tiền và cuộc sống" --words 10
 *
 * The file is created with placeholder words so `npm run validate:content`
 * passes immediately; replace them, run the validator, commit.
 */
import { mkdir, readdir, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

import { lessonSchema } from '../src/content/schema.ts';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const LESSONS_DIR = path.join(ROOT, 'content', 'lessons');

function parseArgs(argv) {
  const args = {};
  for (let i = 0; i < argv.length; i += 1) {
    const token = argv[i];
    if (!token.startsWith('--')) continue;
    const [flag, inline] = token.slice(2).split('=');
    if (inline !== undefined) {
      args[flag] = inline;
      continue;
    }
    // Consume every token up to the next flag, so `--title Money and Life`
    // works even when the shell has already stripped the quotes.
    const value = [];
    while (i + 1 < argv.length && !argv[i + 1].startsWith('--')) {
      value.push(argv[i + 1]);
      i += 1;
    }
    args[flag] = value.length > 0 ? value.join(' ') : 'true';
  }
  return args;
}

function usage(message) {
  if (message) console.error(`Lỗi: ${message}\n`);
  console.error(
    [
      'Cách dùng:',
      '  npm run lesson:new -- --id <slug> --title "<tiêu đề>" [tuỳ chọn]',
      '',
      'Tuỳ chọn:',
      '  --id           bắt buộc. Slug thường, chỉ a-z 0-9 và _ (ví dụ: money_and_life)',
      '  --title        bắt buộc. Tiêu đề hiển thị',
      '  --description  mô tả ngắn (mặc định: rỗng)',
      '  --tags         danh sách tag ngăn cách bằng dấu phẩy (mặc định: rỗng)',
      '  --date         YYYY-MM-DD (mặc định: hôm nay)',
      '  --words        số từ mẫu tạo sẵn (mặc định: 5)',
    ].join('\n'),
  );
  process.exit(1);
}

function today() {
  const now = new Date();
  const pad = (n) => String(n).padStart(2, '0');
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
}

function placeholderWord(index) {
  return {
    word: `placeholder${index}`,
    pos: 'n',
    ipa: '/ˈpleɪshəʊldə/',
    vi: `Nghĩa tiếng Việt của từ ${index}`,
    example: `Replace this sentence with a real example for word ${index}.`,
    collocation: 'collocation một · collocation hai · collocation ba',
  };
}

async function main() {
  const args = parseArgs(process.argv.slice(2));

  const id = args.id?.trim();
  const title = args.title?.trim();
  if (!id) usage('thiếu --id');
  if (!title) usage('thiếu --title');

  const wordCount = Number(args.words ?? 5);
  if (!Number.isInteger(wordCount) || wordCount < 1 || wordCount > 200) {
    usage('--words phải là số nguyên từ 1 đến 200');
  }

  const lesson = {
    id,
    title,
    description: args.description?.trim() ?? '',
    date: args.date?.trim() || today(),
    tags: (args.tags ?? '')
      .split(',')
      .map((tag) => tag.trim())
      .filter(Boolean),
    words: Array.from({ length: wordCount }, (_, i) => placeholderWord(i + 1)),
  };

  const result = lessonSchema.safeParse(lesson);
  if (!result.success) {
    console.error('Không tạo được bài học:\n');
    for (const issue of result.error.issues) {
      console.error(`  ${issue.path.join('.') || '(root)'}: ${issue.message}`);
    }
    process.exit(1);
  }

  await mkdir(LESSONS_DIR, { recursive: true });
  const target = path.join(LESSONS_DIR, `${id}.json`);
  if (existsSync(target)) {
    console.error(`Đã tồn tại content/lessons/${id}.json — chọn id khác hoặc sửa file đó.`);
    process.exit(1);
  }

  await writeFile(target, `${JSON.stringify(lesson, null, 2)}\n`, 'utf8');

  const total = (await readdir(LESSONS_DIR)).filter((name) => name.endsWith('.json')).length;

  console.log(`Đã tạo content/lessons/${id}.json (${wordCount} từ mẫu, tổng ${total} bài học).`);
  console.log('\nTiếp theo:');
  console.log(`  1. Sửa nội dung trong content/lessons/${id}.json`);
  console.log('  2. npm run validate:content');
  console.log('  3. npm run dev            # xem thử');
  console.log(
    `  4. git add content/lessons/${id}.json && git commit -m "content: add ${id}" && git push`,
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
