#!/usr/bin/env node
/**
 * Push `main` to every learner's repo in one command.
 *
 * The "one repo per learner" model means a code change has to reach each fork.
 * Rather than remembering every `git push <remote> main`, this pushes the
 * current branch to `origin` and to every other git remote whose URL points at
 * an `ielts` repository. Add a learner = `git remote add <name> <url>` once, and
 * they are included from then on.
 *
 *   npm run push:all
 *
 * It never force-pushes and never touches anything but the push, so a remote
 * that rejects (diverged history) fails loudly for that one remote and the rest
 * still go.
 */

import { execSync } from 'node:child_process';

function git(args) {
  return execSync(`git ${args}`, { encoding: 'utf8' }).trim();
}

const branch = git('rev-parse --abbrev-ref HEAD');
if (branch !== 'main') {
  console.error(`Đang ở nhánh "${branch}", không phải main. Dừng cho chắc.`);
  process.exit(1);
}

// A remote counts as a learner deployment if its URL mentions an ielts repo.
const remotes = git('remote -v')
  .split('\n')
  .filter((line) => line.endsWith('(push)') && /ielts(\.git)?$/i.test(line.split(/\s+/)[1] ?? ''))
  .map((line) => line.split(/\s+/)[0]);

const unique = [...new Set(remotes)];
if (unique.length === 0) {
  console.error('Không tìm thấy remote ielts nào. Thêm bằng: git remote add <tên> <url>');
  process.exit(1);
}

console.log(`Đẩy main tới ${unique.length} repo: ${unique.join(', ')}\n`);

let failed = 0;
for (const remote of unique) {
  process.stdout.write(`→ ${remote} ... `);
  try {
    execSync(`git push ${remote} main`, { stdio: ['ignore', 'ignore', 'inherit'] });
    console.log('xong');
  } catch {
    failed += 1;
    console.log('LỖI (bỏ qua, xem trên)');
  }
}

if (failed > 0) {
  console.error(`\n${failed}/${unique.length} repo push lỗi. Xem log phía trên.`);
  process.exit(1);
}
console.log('\nTất cả đã cập nhật.');
