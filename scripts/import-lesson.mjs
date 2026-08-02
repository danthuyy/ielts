#!/usr/bin/env node
/**
 * Converts a hand-written vocabulary markdown file into content/lessons/<id>.json.
 *
 *   npm run lesson:import -- --from notes/happiness.md --id hello_happiness \
 *     --title "Hello Happiness" --tags happiness,society
 *
 * Expected markdown, which is the shape these word lists are already written in:
 *
 *   ## 1. Từ vựng về Tiền bạc          <- section headings are ignored
 *   - **Vast (adj) /vɑːst/**: Khổng lồ, vô vàn.
 *     - _Collocation_: A vast fortune (một khối tài sản khổng lồ).
 *     - _Ví dụ_: If they won a vast fortune, they would be back to normal.
 *     - _Lưu ý_: Rất ăn điểm trong Writing Task 2.
 *
 * Collocation, example and note are all optional. Anything the parser cannot
 * make sense of is reported rather than silently dropped — a word quietly lost
 * on import is worse than a failed run.
 */
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

import { lessonSchema } from '../src/content/schema.ts';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const LESSONS_DIR = path.join(ROOT, 'content', 'lessons');

/** `- **Vast (adj) /vɑːst/**: Khổng lồ, vô vàn.` */
const HEAD = /^\s*[-*]\s*\*\*(.+?)\s*\((.+?)\)\s*(\/[^/]*\/)\s*\*\*\s*[:：]\s*(.+?)\s*$/;
/** `  - _Collocation_: ...` */
const SUB = /^\s+[-*]\s*_([^_]+)_\s*[:：]\s*(.+?)\s*$/;
/** Lines we deliberately skip. */
const IGNORABLE = /^\s*(#|>|\||$)/;

const SUB_FIELDS = new Map([
  ['collocation', 'collocation'],
  ['collocations', 'collocation'],
  ['ví dụ', 'example'],
  ['vi du', 'example'],
  ['example', 'example'],
  ['lưu ý', 'note'],
  ['luu y', 'note'],
  ['note', 'note'],
]);

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
      '  npm run lesson:import -- --from <file.md> --id <slug> --title "<tiêu đề>" [tuỳ chọn]',
      '',
      '  --from         bắt buộc. File markdown chứa danh sách từ',
      '  --id           bắt buộc. Slug thường (ví dụ: hello_happiness)',
      '  --title        bắt buộc. Tiêu đề hiển thị',
      '  --description  mô tả ngắn',
      '  --tags         danh sách tag ngăn cách bằng dấu phẩy',
      '  --date         YYYY-MM-DD (mặc định: hôm nay)',
      '  --force        ghi đè nếu file bài học đã tồn tại',
      '  --dry-run      chỉ in kết quả, không ghi file',
    ].join('\n'),
  );
  process.exit(1);
}

/**
 * Lowercases a headword unless it is clearly an acronym or a proper noun —
 * "NASA" and "Sydney" should keep their capitals, "Ubiquitous" should not.
 */
export function normaliseHeadword(raw) {
  const word = raw.trim();
  const words = word.split(/\s+/);
  const looksDeliberate = words.some(
    (part) =>
      // All caps and longer than one letter: an acronym.
      (part.length > 1 && part === part.toUpperCase() && /[A-Z]/.test(part)) ||
      // Internal capital: "iPhone", "McDonald".
      /[a-z][A-Z]/.test(part),
  );
  if (looksDeliberate) return word;

  // A capital only on the first word is just bullet-list styling.
  return word.charAt(0).toLowerCase() + word.slice(1);
}

/** Trailing full stops read as sentence punctuation, not part of the gloss. */
function tidyGloss(text) {
  return text.replace(/\s*\.\s*$/, '').trim();
}

export function parseVocabularyMarkdown(markdown) {
  const words = [];
  const skipped = [];
  let current = null;

  const flush = () => {
    if (current) words.push(current);
    current = null;
  };

  markdown.split(/\r?\n/).forEach((line, index) => {
    const head = HEAD.exec(line);
    if (head) {
      flush();
      const [, word, pos, ipa, vi] = head;
      current = {
        // Word lists capitalise the headword because it starts a bullet, but
        // the app shows it at display size next to existing lowercase entries.
        // Progress keys are slugified either way, so this only affects display.
        word: normaliseHeadword(word),
        pos: pos.trim().toLowerCase(),
        ipa: ipa.trim(),
        vi: tidyGloss(vi),
        example: '',
        collocation: '',
        note: '',
      };
      return;
    }

    const sub = SUB.exec(line);
    if (sub) {
      const field = SUB_FIELDS.get(sub[1].trim().toLowerCase());
      if (!current) {
        skipped.push({
          line: index + 1,
          text: line.trim(),
          why: 'thuộc tính không gắn với từ nào',
        });
      } else if (!field) {
        skipped.push({
          line: index + 1,
          text: line.trim(),
          why: `không hiểu mục "${sub[1].trim()}"`,
        });
      } else {
        // Repeated fields join rather than overwrite.
        current[field] = current[field] ? `${current[field]} · ${sub[2].trim()}` : sub[2].trim();
      }
      return;
    }

    // A bullet that looked like a word entry but did not match the shape is a
    // likely typo in the source; surface it.
    if (/^\s*[-*]\s*\*\*/.test(line)) {
      skipped.push({
        line: index + 1,
        text: line.trim(),
        why: 'không đúng dạng "**Từ (pos) /ipa/**: nghĩa"',
      });
      return;
    }
    if (!IGNORABLE.test(line) && line.trim() && /^\s*[-*]\s/.test(line)) {
      skipped.push({
        line: index + 1,
        text: line.trim(),
        why: 'gạch đầu dòng không nhận dạng được',
      });
    }
  });

  flush();
  return { words, skipped };
}

function today() {
  const now = new Date();
  const pad = (n) => String(n).padStart(2, '0');
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));

  const from = args.from?.trim();
  const id = args.id?.trim();
  const title = args.title?.trim();
  if (!from) usage('thiếu --from');
  if (!id) usage('thiếu --id');
  if (!title) usage('thiếu --title');

  const sourcePath = path.resolve(ROOT, from);
  if (!existsSync(sourcePath)) usage(`không tìm thấy file ${from}`);

  const { words, skipped } = parseVocabularyMarkdown(await readFile(sourcePath, 'utf8'));

  if (words.length === 0) {
    console.error(`Không đọc được từ nào từ ${from}.`);
    console.error('Mỗi từ phải nằm trên một dòng dạng:');
    console.error('  - **Vast (adj) /vɑːst/**: Khổng lồ, vô vàn.');
    process.exit(1);
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
    words,
  };

  const result = lessonSchema.safeParse(lesson);
  if (!result.success) {
    console.error(`\nBài học không hợp lệ sau khi import:\n`);
    for (const issue of result.error.issues) {
      const at = issue.path.join('.');
      const word = typeof issue.path[1] === 'number' ? words[issue.path[1]]?.word : null;
      console.error(`  ${at}${word ? ` (${word})` : ''}: ${issue.message}`);
    }
    process.exit(1);
  }

  const target = path.join(LESSONS_DIR, `${id}.json`);
  if (existsSync(target) && args.force !== 'true') {
    console.error(`Đã tồn tại content/lessons/${id}.json — thêm --force để ghi đè.`);
    process.exit(1);
  }

  const withoutExample = words.filter((word) => !word.example).map((word) => word.word);
  const withoutCollocation = words.filter((word) => !word.collocation).map((word) => word.word);

  console.log(`Đọc ${words.length} từ từ ${from}`);
  if (withoutExample.length > 0) {
    console.log(`  ${withoutExample.length} từ chưa có ví dụ: ${withoutExample.join(', ')}`);
  }
  if (withoutCollocation.length > 0) {
    console.log(
      `  ${withoutCollocation.length} từ chưa có collocation: ${withoutCollocation.join(', ')}`,
    );
  }
  if (skipped.length > 0) {
    console.log(`\n  ${skipped.length} dòng bị bỏ qua — kiểm tra lại nếu không cố ý:`);
    for (const entry of skipped) {
      console.log(`    dòng ${entry.line}: ${entry.why}`);
      console.log(`      ${entry.text.slice(0, 90)}`);
    }
  }

  if (args['dry-run'] === 'true') {
    console.log(`\n(--dry-run) Không ghi file. Kết quả sẽ là content/lessons/${id}.json`);
    return;
  }

  await mkdir(LESSONS_DIR, { recursive: true });
  await writeFile(target, `${JSON.stringify(result.data, null, 2)}\n`, 'utf8');

  console.log(`\nĐã ghi content/lessons/${id}.json`);
  console.log('\nTiếp theo:');
  console.log('  1. npm run validate:content');
  console.log('  2. npm run dev            # xem thử');
  console.log(`  3. git add content/lessons/${id}.json && git commit -m "content: add ${id}"`);
}

// Only run when invoked as a command; the parser is imported by tests.
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}
