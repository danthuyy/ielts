import { youglishUrl, type Accent } from '@/lib/youglish';

interface Props {
  word: string;
  /** `icon` for tight rows, `full` when there is room for a label. */
  variant?: 'icon' | 'full';
  className?: string;
}

/**
 * Both accents, because the two are genuinely different words to the ear and
 * the exam accepts either. The content uses British IPA, so British leads.
 */
const ACCENTS: { code: Accent; flag: string; label: string }[] = [
  { code: 'uk', flag: '🇬🇧', label: 'Anh-Anh' },
  { code: 'us', flag: '🇺🇸', label: 'Anh-Mỹ' },
];

/** Opens the word on YouGlish, in a new tab — one link per accent. */
export function YouglishLink({ word, variant = 'icon', className }: Props) {
  return (
    <span className={`youglish-group${className ? ` ${className}` : ''}`}>
      {ACCENTS.map((accent) => (
        <a
          key={accent.code}
          className={`youglish youglish--${variant}`}
          href={youglishUrl(word, accent.code)}
          target="_blank"
          // noreferrer as well as noopener: YouGlish has no business knowing
          // which screen the learner came from.
          rel="noopener noreferrer"
          title={`Nghe người bản xứ nói "${word}" giọng ${accent.label} trên YouGlish`}
          aria-label={`Nghe "${word}" giọng ${accent.label} trên YouGlish, mở tab mới`}
          // Inside the flashcard the whole card is a flip target.
          onClick={(event) => event.stopPropagation()}
        >
          <span aria-hidden="true">🎬{accent.flag}</span>
          {variant === 'full' && <span>YouGlish</span>}
        </a>
      ))}
    </span>
  );
}
