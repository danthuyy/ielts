import type { Lesson } from './schema';

export interface Category {
  key: string;
  label: string;
  icon: string;
}

/**
 * Topic taxonomy. Lessons declare free-form tags; the first tag that maps to an
 * entry here decides the lesson's category, so adding a lesson needs no code
 * change unless it introduces a genuinely new subject area.
 */
export const CATEGORIES: Record<string, Omit<Category, 'key'>> = {
  happiness: { label: 'Hạnh phúc & Cảm xúc', icon: '😊' },
  society: { label: 'Xã hội', icon: '🏙️' },
  psychology: { label: 'Tâm lý học', icon: '🧠' },
  education: { label: 'Giáo dục', icon: '🎓' },
  environment: { label: 'Môi trường', icon: '🌱' },
  technology: { label: 'Công nghệ', icon: '💻' },
  health: { label: 'Sức khoẻ', icon: '🩺' },
  work: { label: 'Công việc', icon: '💼' },
  money: { label: 'Kinh tế & Tiền bạc', icon: '💰' },
  culture: { label: 'Văn hoá & Nghệ thuật', icon: '🎭' },
  travel: { label: 'Du lịch', icon: '✈️' },
  media: { label: 'Truyền thông', icon: '📰' },
  crime: { label: 'Pháp luật & Tội phạm', icon: '⚖️' },
  family: { label: 'Gia đình', icon: '👨‍👩‍👧' },
  sport: { label: 'Thể thao', icon: '⚽' },
  food: { label: 'Ẩm thực', icon: '🍜' },
};

export const UNCATEGORISED: Category = { key: 'other', label: 'Khác', icon: '📘' };

export function categoryOf(lesson: Pick<Lesson, 'tags'>): Category {
  for (const tag of lesson.tags) {
    const match = CATEGORIES[tag];
    if (match) return { key: tag, ...match };
  }
  return UNCATEGORISED;
}

export interface CategoryGroup extends Category {
  lessons: Lesson[];
}

/** All categories present in the given lessons, each with its lessons attached. */
export function groupByCategory(lessons: readonly Lesson[]): CategoryGroup[] {
  const groups = new Map<string, CategoryGroup>();
  for (const lesson of lessons) {
    const category = categoryOf(lesson);
    let group = groups.get(category.key);
    if (!group) {
      group = { ...category, lessons: [] };
      groups.set(category.key, group);
    }
    group.lessons.push(lesson);
  }
  return [...groups.values()];
}
