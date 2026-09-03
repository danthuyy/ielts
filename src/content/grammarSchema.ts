import { z } from 'zod';

/**
 * Grammar lessons.
 *
 * Kept apart from the word lessons rather than squeezed into them: a grammar
 * point is a rule plus practice, not a headword with a meaning, and forcing it
 * into the vocabulary shape would have meant drilling fixed sentences by rote —
 * which is the very habit these lessons exist to replace.
 */

const grammarIdSchema = z
  .string()
  .regex(/^[a-z0-9]+(?:_[a-z0-9]+)*$/, 'id phải là slug thường, dạng "gram_01"');

const exampleSchema = z.object({
  en: z.string().min(1).trim(),
  vi: z.string().min(1).trim(),
});

const pointSchema = z.object({
  /** The rule in its shortest form, e.g. "He / She / It + động từ thêm -s". */
  rule: z.string().min(1).trim(),
  /** The explanation, in Vietnamese. */
  vi: z.string().min(1).trim(),
  examples: z.array(exampleSchema).min(1),
});

const drillSchema = z
  .object({
    /** The sentence with exactly one blank, written as "___". */
    q: z.string().min(1).trim(),
    /** The correct filler. */
    a: z.string().min(1).trim(),
    /** Options offered, including the answer. */
    choices: z.array(z.string().min(1)).min(2),
    /** The whole sentence in Vietnamese, shown after answering. */
    vi: z.string().min(1).trim(),
  })
  .refine((drill) => drill.q.includes('___'), {
    message: 'câu hỏi phải có đúng một chỗ trống "___"',
  })
  .refine((drill) => drill.choices.includes(drill.a), {
    message: 'đáp án "a" phải nằm trong "choices"',
  });

export const grammarSchema = z.object({
  id: grammarIdSchema,
  title: z.string().min(1).trim(),
  /** Teaching order — these build on each other, so the list is never alphabetical. */
  order: z.number().int().positive(),
  summary: z.string().min(1).trim(),
  points: z.array(pointSchema).min(1),
  drills: z.array(drillSchema).min(4),
  /** Empty means everyone; otherwise only the learners named. Mirrors lessons. */
  audience: z.array(z.string().min(1)).default([]),
});

export type GrammarLesson = z.infer<typeof grammarSchema>;
export type GrammarDrill = GrammarLesson['drills'][number];
export type GrammarPoint = GrammarLesson['points'][number];
