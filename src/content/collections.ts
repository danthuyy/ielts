import type { Lesson } from './schema';

export interface CollectionDef {
  key: string;
  label: string;
  icon: string;
  hint: string;
}

/**
 * The shelves the library is sorted onto. A lesson goes on the first shelf whose
 * test it passes, so the order here is also the order on screen: the beginner
 * tracks come before the topic lessons, which are the bulk and come last.
 */
const SHELVES: (CollectionDef & { test: (lesson: Lesson) => boolean })[] = [
  {
    key: 'basics',
    label: 'Cơ bản',
    icon: '🌱',
    hint: 'Bảng chữ cái, số, màu sắc, gia đình… từ vỡ lòng',
    test: (lesson) => lesson.tags.includes('basics'),
  },
  {
    key: 'english8',
    label: 'Tiếng Anh lớp 8',
    icon: '📗',
    hint: 'Theo từng Unit sách Global Success',
    test: (lesson) => lesson.tags.includes('english8'),
  },
  {
    key: 'english10',
    label: 'Tiếng Anh lớp 10',
    icon: '📘',
    hint: 'Theo từng Unit sách Global Success',
    test: (lesson) => lesson.tags.includes('english10'),
  },
  {
    key: 'awl',
    label: 'Từ học thuật (AWL)',
    icon: '🎓',
    hint: '10 nhóm từ học thuật dùng nhiều trong IELTS',
    test: (lesson) => lesson.id.startsWith('awl_sublist'),
  },
  {
    key: 'topics',
    label: 'Chủ đề IELTS',
    icon: '🗂️',
    hint: 'Từ vựng theo chủ đề Writing / Speaking',
    test: () => true,
  },
];

export interface Collection extends CollectionDef {
  lessons: Lesson[];
}

/** Shelves that hold at least one lesson, in display order. */
export function groupByCollection(lessons: readonly Lesson[]): Collection[] {
  const out: Collection[] = SHELVES.map((shelf) => ({
    key: shelf.key,
    label: shelf.label,
    icon: shelf.icon,
    hint: shelf.hint,
    lessons: [],
  }));
  for (const lesson of lessons) {
    const at = SHELVES.findIndex((shelf) => shelf.test(lesson));
    out[at]?.lessons.push(lesson);
  }
  // The school and beginner shelves are courses, read in order: "Unit 2" has to
  // come before "Unit 10". Topic lessons keep the order they were added in.
  for (const collection of out) {
    if (collection.key === 'topics' || collection.key === 'awl') continue;
    collection.lessons.sort((x, y) => x.title.localeCompare(y.title, 'vi', { numeric: true }));
  }
  return out.filter((collection) => collection.lessons.length > 0);
}
