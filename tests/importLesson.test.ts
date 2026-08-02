import { describe, expect, it } from 'vitest';

// @ts-expect-error — plain JS CLI module, no type declarations by design.
import { normaliseHeadword, parseVocabularyMarkdown } from '../scripts/import-lesson.mjs';

interface ParsedWord {
  word: string;
  pos: string;
  ipa: string;
  vi: string;
  example: string;
  collocation: string;
  note: string;
}

interface ParseResult {
  words: ParsedWord[];
  skipped: { line: number; text: string; why: string }[];
}

const parse = parseVocabularyMarkdown as (markdown: string) => ParseResult;

describe('parseVocabularyMarkdown', () => {
  it('reads a full entry with every sub-field', () => {
    const { words } = parse(
      [
        '## 1. Từ vựng về Tiền bạc',
        '- **Vast (adj) /vɑːst/**: Khổng lồ, vô vàn.',
        '  - _Collocation_: A vast fortune.',
        '  - _Ví dụ_: They won a vast fortune.',
        '  - _Lưu ý_: Rất ăn điểm trong Writing Task 2.',
      ].join('\n'),
    );

    expect(words).toHaveLength(1);
    expect(words[0]).toEqual({
      // Lowercased: the capital was bullet-list styling, not part of the word.
      word: 'vast',
      pos: 'adj',
      ipa: '/vɑːst/',
      vi: 'Khổng lồ, vô vàn',
      collocation: 'A vast fortune.',
      example: 'They won a vast fortune.',
      note: 'Rất ăn điểm trong Writing Task 2.',
    });
  });

  it('leaves optional fields empty rather than inventing them', () => {
    const { words } = parse('- **Nutrition (n) /njuːˈtrɪʃ.ən/**: Dinh dưỡng.');
    expect(words[0]).toMatchObject({ example: '', collocation: '', note: '' });
  });

  it('keeps a two-part part of speech', () => {
    const { words } = parse('- **Interact (v/n) /ˌɪn.təˈrækt/**: Tương tác.');
    expect(words[0]?.pos).toBe('v/n');
  });

  it('accepts the unaccented spellings of the sub-field labels', () => {
    const { words } = parse(
      [
        '- **Sustain (v) /səˈsteɪn/**: Duy trì.',
        '  - _Vi du_: Hard to sustain.',
        '  - _Note_: Formal.',
      ].join('\n'),
    );
    expect(words[0]).toMatchObject({ example: 'Hard to sustain.', note: 'Formal.' });
  });

  it('joins a repeated field instead of overwriting it', () => {
    const { words } = parse(
      [
        '- **Vast (adj) /vɑːst/**: Khổng lồ.',
        '  - _Collocation_: a vast fortune',
        '  - _Collocation_: vast majority',
      ].join('\n'),
    );
    expect(words[0]?.collocation).toBe('a vast fortune · vast majority');
  });

  it('separates consecutive entries', () => {
    const { words } = parse(
      [
        '- **Vast (adj) /vɑːst/**: Khổng lồ.',
        '  - _Ví dụ_: A vast fortune.',
        '- **Adequate (adj) /ˈæd.ə.kwət/**: Đầy đủ.',
      ].join('\n'),
    );
    expect(words.map((word) => word.word)).toEqual(['vast', 'adequate']);
    expect(words[1]?.example).toBe('');
  });

  it('ignores headings, prose and blank lines', () => {
    const { words, skipped } = parse(
      [
        '# Từ Vựng Nâng Band',
        '',
        'Dựa trên bài đọc, dưới đây là danh sách.',
        '## 1. Tiền bạc',
        '- **Vast (adj) /vɑːst/**: Khổng lồ.',
      ].join('\n'),
    );
    expect(words).toHaveLength(1);
    expect(skipped).toHaveLength(0);
  });

  it('reports a malformed entry rather than dropping it silently', () => {
    const { words, skipped } = parse('- **Vast adj /vɑːst/**: thiếu ngoặc quanh loại từ.');
    expect(words).toHaveLength(0);
    expect(skipped).toHaveLength(1);
    expect(skipped[0]?.why).toMatch(/không đúng dạng/);
  });

  it('reports a sub-field label it does not understand', () => {
    const { skipped } = parse(
      ['- **Vast (adj) /vɑːst/**: Khổng lồ.', '  - _Synonym_: enormous'].join('\n'),
    );
    expect(skipped[0]?.why).toMatch(/không hiểu mục "Synonym"/);
  });

  it('handles CRLF line endings', () => {
    const { words } = parse(
      '- **Vast (adj) /vɑːst/**: Khổng lồ.\r\n  - _Ví dụ_: A vast fortune.\r\n',
    );
    expect(words[0]?.example).toBe('A vast fortune.');
  });
});

describe('normaliseHeadword', () => {
  const normalise = normaliseHeadword as (raw: string) => string;

  it('drops the capital that bullet-list styling added', () => {
    expect(normalise('Ubiquitous')).toBe('ubiquitous');
    expect(normalise('Material wealth')).toBe('material wealth');
  });

  it('leaves an already-lowercase word alone', () => {
    expect(normalise('vast')).toBe('vast');
  });

  it('keeps acronyms', () => {
    expect(normalise('NASA')).toBe('NASA');
    expect(normalise('GDP')).toBe('GDP');
  });

  it('keeps deliberate internal capitals', () => {
    expect(normalise('iPhone')).toBe('iPhone');
    expect(normalise('McDonald')).toBe('McDonald');
  });

  it('trims surrounding whitespace', () => {
    expect(normalise('  Obsolete  ')).toBe('obsolete');
  });
});
