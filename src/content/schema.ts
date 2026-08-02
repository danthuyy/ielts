import { z } from 'zod';

/**
 * The lesson file format. This schema is the single source of truth: the app
 * types, the CLI validator and the CI check all derive from it, so a lesson
 * that passes `npm run validate:content` cannot break the app at runtime.
 */

export const PARTS_OF_SPEECH = ['n', 'v', 'adj', 'adv', 'phrasal v', 'phr', 'idiom'] as const;

/** Lesson ids become part of every learner's saved progress key — keep them stable. */
const lessonIdSchema = z
  .string()
  .regex(/^[a-z0-9]+(?:_[a-z0-9]+)*$/, 'id phải là slug thường, dạng "hello_happiness"');

export const wordSchema = z.object({
  /** The English headword. Unique within a lesson; used to derive the progress key. */
  word: z.string().min(1).trim(),
  pos: z.enum(PARTS_OF_SPEECH),
  /** IPA including the surrounding slashes, e.g. "/vɑːst/". */
  ipa: z.string().min(1),
  /** Vietnamese meaning. */
  vi: z.string().min(1),
  /** A full sentence showing the word in use. */
  example: z.string().min(1),
  /** Common collocations, separated by " · ". */
  collocation: z.string().min(1),
});

export const lessonSchema = z
  .object({
    id: lessonIdSchema,
    title: z.string().min(1),
    description: z.string().default(''),
    /** ISO date, YYYY-MM-DD. */
    date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'date phải có dạng YYYY-MM-DD'),
    tags: z.array(z.string().min(1)).default([]),
    words: z.array(wordSchema).min(1, 'bài học phải có ít nhất 1 từ'),
  })
  .superRefine((lesson, ctx) => {
    const seen = new Map<string, number>();
    lesson.words.forEach((entry, index) => {
      const key = entry.word.toLowerCase();
      const first = seen.get(key);
      if (first !== undefined) {
        ctx.addIssue({
          code: 'custom',
          path: ['words', index, 'word'],
          message: `từ "${entry.word}" bị trùng với words[${first}]`,
        });
        return;
      }
      seen.set(key, index);
    });
  });

export type Word = z.infer<typeof wordSchema>;
export type Lesson = z.infer<typeof lessonSchema>;

/** A word plus everything needed to look up its progress. */
export interface StudyWord extends Word {
  /** Stable progress key — see `lib/ids.ts`. */
  id: string;
  lessonId: string;
}
