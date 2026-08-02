import { describe, expect, it } from 'vitest';

import { ALL_STUDY_WORDS, getLesson, getStudyWord, LESSONS, studyWordsOf } from '@/content/lessons';
import { categoryOf, groupByCategory } from '@/content/categories';
import { lessonSchema } from '@/content/schema';
import { wordKey } from '@/lib/ids';

describe('lesson content', () => {
  it('discovers at least one lesson from content/lessons', () => {
    expect(LESSONS.length).toBeGreaterThan(0);
  });

  it('has a unique id per lesson', () => {
    const ids = LESSONS.map((lesson) => lesson.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('validates every shipped lesson against the schema', () => {
    for (const lesson of LESSONS) {
      expect(lessonSchema.safeParse(lesson).success).toBe(true);
    }
  });

  it('is sorted newest first', () => {
    const dates = LESSONS.map((lesson) => lesson.date);
    expect([...dates].sort((a, b) => b.localeCompare(a))).toEqual(dates);
  });

  it('gives every word a unique, stable progress key', () => {
    const ids = ALL_STUDY_WORDS.map((word) => word.id);
    expect(new Set(ids).size).toBe(ids.length);

    const first = LESSONS[0]!;
    const word = first.words[0]!;
    expect(wordKey(first.id, word.word)).toBe(studyWordsOf(first)[0]!.id);
  });

  it('resolves a progress key back to its word', () => {
    const sample = ALL_STUDY_WORDS[0]!;
    expect(getStudyWord(sample.id)?.word).toBe(sample.word);
    expect(getStudyWord('does_not:exist')).toBeUndefined();
  });

  it('looks lessons up by id', () => {
    expect(getLesson(LESSONS[0]!.id)?.id).toBe(LESSONS[0]!.id);
    expect(getLesson('nope')).toBeUndefined();
    expect(getLesson(undefined)).toBeUndefined();
  });
});

describe('categories', () => {
  it('maps the first known tag to a category', () => {
    expect(categoryOf({ tags: ['happiness', 'society'] }).key).toBe('happiness');
  });

  it('falls back to "Khác" for unknown tags', () => {
    expect(categoryOf({ tags: ['definitely-not-a-category'] }).key).toBe('other');
    expect(categoryOf({ tags: [] }).key).toBe('other');
  });

  it('groups every lesson exactly once', () => {
    const groups = groupByCategory(LESSONS);
    const total = groups.reduce((sum, group) => sum + group.lessons.length, 0);
    expect(total).toBe(LESSONS.length);
  });
});

describe('lessonSchema', () => {
  const valid = {
    id: 'sample_lesson',
    title: 'Sample',
    date: '2026-01-01',
    words: [
      {
        word: 'vast',
        pos: 'adj',
        ipa: '/vɑːst/',
        vi: 'Khổng lồ',
        example: 'A vast fortune.',
        collocation: 'a vast fortune',
      },
    ],
  };

  it('accepts a minimal valid lesson and fills defaults', () => {
    const result = lessonSchema.safeParse(valid);
    expect(result.success).toBe(true);
    expect(result.data?.tags).toEqual([]);
    expect(result.data?.description).toBe('');
  });

  it('rejects a non-slug id', () => {
    expect(lessonSchema.safeParse({ ...valid, id: 'Not A Slug' }).success).toBe(false);
  });

  it('rejects a malformed date', () => {
    expect(lessonSchema.safeParse({ ...valid, date: '01/01/2026' }).success).toBe(false);
  });

  it('rejects an unknown part of speech', () => {
    const words = [{ ...valid.words[0]!, pos: 'noun' }];
    expect(lessonSchema.safeParse({ ...valid, words }).success).toBe(false);
  });

  it('rejects an empty word list', () => {
    expect(lessonSchema.safeParse({ ...valid, words: [] }).success).toBe(false);
  });

  it('rejects a duplicated headword', () => {
    const words = [valid.words[0]!, { ...valid.words[0]!, vi: 'khác' }];
    const result = lessonSchema.safeParse({ ...valid, words });
    expect(result.success).toBe(false);
    expect(result.error?.issues[0]?.message).toContain('trùng');
  });
});
