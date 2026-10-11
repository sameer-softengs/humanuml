
/**
 * HumanUML — Source Contracts
 *
 * Defines source positions for requirements
 * and compiler diagnostics.
 */

export interface SourceSpan {
  /** Inclusive UTF-16 start offset */
  start: number;

  /** Exclusive UTF-16 end offset */
  end: number;
}

export function createSourceSpan(
  start: number,
  end: number
): SourceSpan {
  if (
    !Number.isSafeInteger(start) ||
    !Number.isSafeInteger(end) ||
    start < 0 ||
    end < start
  ) {
    throw new RangeError(
      "Invalid source span: expected 0 <= start <= end."
    );
  }

  return { start, end };
}
