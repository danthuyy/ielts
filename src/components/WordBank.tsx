interface Props {
  /** The tray, already shuffled by the caller so it stays put across renders. */
  tiles: readonly string[];
  /** Indices into `tiles`, in the order they were placed. */
  placed: readonly number[];
  onChange: (next: number[]) => void;
  disabled?: boolean;
}

/**
 * Build the word by tapping its pieces in order.
 *
 * Tapping a placed piece sends it back to the tray, so there is no separate
 * delete key to find and no way to get stuck. Every tile is a real button:
 * this has to work from the keyboard as well as from a thumb.
 */
export function WordBank({ tiles, placed, onChange, disabled = false }: Props) {
  const used = new Set(placed);

  return (
    <div className="wordbank">
      <div className="wordbank__answer" aria-label="Từ bạn đang ghép">
        {placed.length === 0 ? (
          <span className="wordbank__empty">Bấm các mảnh bên dưới để ghép từ</span>
        ) : (
          placed.map((index, position) => (
            <button
              type="button"
              className="wordbank__tile wordbank__tile--placed"
              key={`${index}-${position}`}
              disabled={disabled}
              onClick={() => onChange(placed.filter((_, at) => at !== position))}
              aria-label={`Bỏ mảnh ${tiles[index]}`}
            >
              {tiles[index]}
            </button>
          ))
        )}
      </div>

      <div className="wordbank__tray" role="group" aria-label="Các mảnh chữ">
        {tiles.map((tile, index) => (
          <button
            type="button"
            className="wordbank__tile"
            key={`${tile}-${index}`}
            // Kept in place rather than removed: tiles that reflow as they are
            // used move the one being reached for out from under the finger.
            disabled={disabled || used.has(index)}
            onClick={() => onChange([...placed, index])}
          >
            {tile}
          </button>
        ))}
      </div>
    </div>
  );
}
