import { z } from 'zod';

/**
 * The lesson file format. This schema is the single source of truth: the app
 * types, the CLI validator and the CI check all derive from it, so a lesson
 * that passes `npm run validate:content` cannot break the app at runtime.
 */

export const PARTS_OF_SPEECH = ['n', 'v', 'adj', 'adv', 'phrasal v', 'phr', 'idiom'] as const;

/**
 * A single part of speech, or two joined with "/" for words that genuinely are
 * both — "v/n" is common in IELTS word lists and forcing the author to pick one
 * loses information the learner needs.
 */
const posPattern = (() => {
  const atom = PARTS_OF_SPEECH.map((value) => value.replace(/ /g, '\\s')).join('|');
  return new RegExp(`^(${atom})(/(${atom}))?$`);
})();

/** Lesson ids become part of every learner's saved progress key — keep them stable. */
const lessonIdSchema = z
  .string()
  .regex(/^[a-z0-9]+(?:_[a-z0-9]+)*$/, 'id phải là slug thường, dạng "hello_happiness"');

export const wordSchema = z.object({
  /** The English headword. Unique within a lesson; used to derive the progress key. */
  word: z.string().min(1).trim(),
  pos: z.string().regex(posPattern, `pos phải là một trong: ${PARTS_OF_SPEECH.join(', ')}`),
  /** IPA including the surrounding slashes, e.g. "/vɑːst/". */
  ipa: z.string().min(1),
  /** Vietnamese meaning. */
  vi: z.string().min(1),
  /**
   * Optional. Plenty of words have no natural collocation and no example worth
   * quoting; requiring them only pushes authors into inventing filler, and the
   * UI hides whichever field is empty.
   */
  example: z.string().default(''),
  /** Common collocations, separated by " · ". */
  collocation: z.string().default(''),
  /**
   * Near-synonyms, separated by " · " — the paraphrase words an IELTS learner
   * reaches for so they are not repeating the headword. Optional: plenty of
   * words have no clean synonym, and the UI hides the field when it is empty.
   */
  synonyms: z.string().default(''),
  /**
   * The word family — the same root in its other parts of speech, e.g. for
   * "analyse": "analysis (n) · analytical (adj) · analyst (n)". Word formation
   * is its own IELTS skill; showing the family turns one headword into a small
   * cluster the learner can recognise and produce. Optional, " · "-separated,
   * each entry tagged with its part of speech in brackets.
   */
  forms: z.string().default(''),
  /** A usage tip — when to reach for the word, register, common mistakes. */
  note: z.string().default(''),
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
