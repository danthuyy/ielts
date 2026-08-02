import { stickerAlt, stickerUrl, type StickerName } from '@/lib/stickers';

interface Props {
  name: StickerName;
  size?: 'sm' | 'md' | 'lg';
  /** Changes to this remount the image, so the animation replays. */
  replayKey?: string | number;
  className?: string;
}

export function Sticker({ name, size = 'md', replayKey, className }: Props) {
  return (
    <img
      key={replayKey === undefined ? undefined : `${name}-${replayKey}`}
      className={`sticker sticker--${size}${className ? ` ${className}` : ''}`}
      src={stickerUrl(name)}
      alt={stickerAlt(name)}
      width={192}
      height={192}
      // Feedback stickers appear mid-session; decoding ahead avoids a blank
      // frame at the exact moment the learner is looking for the reaction.
      decoding="async"
      draggable={false}
    />
  );
}
