import { lessonSchema, type Lesson, type StudyWord } from './schema';
import { wordKey } from '@/lib/ids';

/**
 * Lessons are discovered from `content/lessons/*.json` at build time. Adding a
 * lesson is therefore "drop a file in, commit" — there is no index to register
 * it in and no code to touch. `npm run validate:content` (and CI) checks the
 * same schema used here, so a malformed lesson fails the build, not the app.
 */
const modules = import.meta.glob<{ default: unknown }>('../../content/lessons/*.json', {
  eager: true,
});

function parseAll(): Lesson[] {
  const parsed: Lesson[] = [];

  for (const [path, module] of Object.entries(modules)) {
    const filename = path.split('/').pop() ?? path;
    const result = lessonSchema.safeParse(module.default);

    if (!result.success) {
      const details = result.error.issues
        .map((issue) => `  ${issue.path.join('.') || '(root)'}: ${issue.message}`)
        .join('\n');
      throw new Error(`Bài học không hợp lệ: content/lessons/${filename}\n${details}`);
    }

    const expectedId = filename.replace(/\.json$/, '');
    if (result.data.id !== expectedId) {
      throw new Error(
        `Bài học content/lessons/${filename} có id "${result.data.id}" — id phải trùng tên file ("${expectedId}").`,
      );
    }

    parsed.push(result.data);
  }

  const duplicates = parsed.filter(
    (lesson, i) => parsed.findIndex((l) => l.id === lesson.id) !== i,
  );
  if (duplicates.length > 0) {
    throw new Error(`Trùng id bài học: ${duplicates.map((l) => l.id).join(', ')}`);
  }

  // Newest first, then alphabetical so the order never depends on the
  // filesystem's iteration order.
  return parsed.sort((a, b) => b.date.localeCompare(a.date) || a.title.localeCompare(b.title));
}

/**
 * Whether a lesson is shown to a given learner.
 *
 * A shared lesson (no audience) is visible to everyone. A private lesson is
 * visible only to the learners in its audience — except the admin build, which
 * passes an empty learner and sees every lesson so the whole library can be
 * managed and previewed from one place.
 */
export function isVisibleTo(lesson: Pick<Lesson, 'audience'>, learner: string): boolean {
  if (lesson.audience.length === 0) return true;
  if (learner === '') return true;
  return lesson.audience.includes(learner);
}

/**
 * Which learner this build is for. Set per deployment via the `VITE_LEARNER`
 * Actions variable; empty on the admin build.
 */
const LEARNER = (import.meta.env.VITE_LEARNER ?? '').trim();

// Validation and de-duplication run over every file first, so a broken or
// duplicated lesson fails the build regardless of who it is for; only then is
// the list narrowed to what this deployment shows.
export const LESSONS: readonly Lesson[] = parseAll().filter((lesson) =>
  isVisibleTo(lesson, LEARNER),
);

/**
 * The lessons this build's learner is actually studying.
 *
 * Same as LESSONS on a learner build, where everything visible is theirs. On the
 * admin build it drops the lessons aimed at someone else: those are visible so
 * they can be previewed, but they are not what the admin studies, and letting
 * one lead the quick-study button pointed an IELTS learner at a beginner
 * alphabet lesson.
 */
export const OWN_LESSONS: readonly Lesson[] =
  LEARNER === '' ? LESSONS.filter((lesson) => lesson.audience.length === 0) : LESSONS;

const byId = new Map(LESSONS.map((lesson) => [lesson.id, lesson]));

export function getLesson(lessonId: string | undefined): Lesson | undefined {
  return lessonId === undefined ? undefined : byId.get(lessonId);
}

// Content is immutable at runtime, so the derived list is built once per
// lesson. Returning a stable array matters: React effects key off it, and a
// fresh array on every render would re-trigger them.
const studyWordCache = new Map<string, readonly StudyWord[]>();

/** A lesson's words, each carrying the key its progress is stored under. */
export function studyWordsOf(lesson: Lesson): readonly StudyWord[] {
  const cached = studyWordCache.get(lesson.id);
  if (cached) return cached;

  const words: readonly StudyWord[] = lesson.words.map((word) => ({
    ...word,
    id: wordKey(lesson.id, word.word),
    lessonId: lesson.id,
  }));
  studyWordCache.set(lesson.id, words);
  return words;
}

export const ALL_STUDY_WORDS: readonly StudyWord[] = LESSONS.flatMap((lesson) => [
  ...studyWordsOf(lesson),
]);

const byKey = new Map(ALL_STUDY_WORDS.map((word) => [word.id, word]));

/** Resolve a stored progress key back to its word, or undefined if orphaned. */
export function getStudyWord(id: string): StudyWord | undefined {
  return byKey.get(id);
}

export const TOTAL_WORD_COUNT = ALL_STUDY_WORDS.length;
