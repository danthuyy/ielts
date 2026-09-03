import {
  grammarSchema,
  type GrammarLesson,
} from './grammarSchema';

export type { GrammarLesson, GrammarDrill, GrammarPoint } from './grammarSchema';

/**
 * Loads the grammar files and narrows them to this build's learner.
 *
 * Split from the schema for the same reason the word lessons are: the CLI
 * validator runs under plain Node, which has no `import.meta.glob`, so the
 * shape has to live in a file Node can import on its own.
 */
const files = import.meta.glob<{ default: unknown }>('/content/grammar/*.json', { eager: true });

function parseAll(): GrammarLesson[] {
  const parsed: GrammarLesson[] = [];
  for (const [path, module] of Object.entries(files)) {
    const result = grammarSchema.safeParse(module.default);
    if (!result.success) {
      throw new Error(`Bài ngữ pháp hỏng: ${path}\n${result.error.issues[0]?.message ?? ''}`);
    }
    const expected = path.split('/').pop()?.replace('.json', '');
    if (result.data.id !== expected) {
      throw new Error(`Bài ngữ pháp ${path}: id "${result.data.id}" phải trùng tên file`);
    }
    parsed.push(result.data);
  }
  // Teaching order: to-be before the present simple before the past.
  return parsed.sort((a, b) => a.order - b.order);
}

const LEARNER = (import.meta.env.VITE_LEARNER ?? '').trim();

function isVisibleTo(lesson: GrammarLesson, learner: string): boolean {
  if (lesson.audience.length === 0) return true;
  if (learner === '') return true;
  return lesson.audience.includes(learner);
}

export const GRAMMAR: readonly GrammarLesson[] = parseAll().filter((lesson) =>
  isVisibleTo(lesson, LEARNER),
);

const byId = new Map(GRAMMAR.map((lesson) => [lesson.id, lesson]));

export function getGrammar(id: string | undefined): GrammarLesson | undefined {
  return id === undefined ? undefined : byId.get(id);
}

/** The next lesson in teaching order, for the "học tiếp" link on the result. */
export function nextGrammar(id: string): GrammarLesson | undefined {
  const index = GRAMMAR.findIndex((lesson) => lesson.id === id);
  return index < 0 ? undefined : GRAMMAR[index + 1];
}
