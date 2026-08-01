// Topic taxonomy. Lessons declare free-form tags; the first tag that maps to an
// entry here decides the lesson's category, so adding a lesson needs no change
// unless it introduces a genuinely new subject area.
export const CATEGORIES = {
  happiness:   { label: 'Hạnh phúc & Cảm xúc', icon: '😊' },
  society:     { label: 'Xã hội',              icon: '🏙️' },
  psychology:  { label: 'Tâm lý học',          icon: '🧠' },
  education:   { label: 'Giáo dục',            icon: '🎓' },
  environment: { label: 'Môi trường',          icon: '🌱' },
  technology:  { label: 'Công nghệ',           icon: '💻' },
  health:      { label: 'Sức khoẻ',            icon: '🩺' },
  work:        { label: 'Công việc',           icon: '💼' },
  money:       { label: 'Kinh tế & Tiền bạc',  icon: '💰' },
  culture:     { label: 'Văn hoá & Nghệ thuật',icon: '🎭' },
  travel:      { label: 'Du lịch',             icon: '✈️' },
  media:       { label: 'Truyền thông',        icon: '📰' },
  crime:       { label: 'Pháp luật & Tội phạm',icon: '⚖️' },
  family:      { label: 'Gia đình',            icon: '👨‍👩‍👧' },
  sport:       { label: 'Thể thao',            icon: '⚽' },
  food:        { label: 'Ẩm thực',             icon: '🍜' }
};

export const UNCATEGORISED = { label: 'Khác', icon: '📘' };

export function categoryOf(lesson) {
  for (const tag of lesson.tags || []) {
    if (CATEGORIES[tag]) return { key: tag, ...CATEGORIES[tag] };
  }
  return { key: 'other', ...UNCATEGORISED };
}

/** All categories present in the given lessons, each with its lessons attached. */
export function groupByCategory(lessons) {
  const groups = new Map();
  for (const lesson of lessons) {
    const cat = categoryOf(lesson);
    if (!groups.has(cat.key)) groups.set(cat.key, { ...cat, lessons: [] });
    groups.get(cat.key).lessons.push(lesson);
  }
  return [...groups.values()];
}
