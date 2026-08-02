import { youglishUrl } from '@/lib/youglish';

interface Props {
  word: string;
  /** `icon` for tight rows, `full` when there is room for a label. */
  variant?: 'icon' | 'full';
  className?: string;
}

/** Opens the word on YouGlish, in a new tab. */
export function YouglishLink({ word, variant = 'icon', className }: Props) {
  return (
    <a
      className={`youglish youglish--${variant}${className ? ` ${className}` : ''}`}
      href={youglishUrl(word)}
      target="_blank"
      // noreferrer as well as noopener: YouGlish has no business knowing which
      // screen the learner came from.
      rel="noopener noreferrer"
      title={`Nghe người bản xứ nói "${word}" trên YouGlish`}
      aria-label={`Nghe "${word}" trên YouGlish, mở tab mới`}
      // Inside the flashcard the whole card is a flip target.
      onClick={(event) => event.stopPropagation()}
    >
      <span aria-hidden="true">🎬</span>
      {variant === 'full' && <span>YouGlish</span>}
    </a>
  );
}
