
import { describe, expect, it } from "vitest";

import {
  createSourceSpan
} from "../../packages/contracts/src/source";

describe("HumanUML SourceSpan", () => {
  it("creates a valid source span", () => {
    const span = createSourceSpan(0, 10);

    expect(span).toEqual({
      start: 0,
      end: 10
    });
  });

  it("rejects negative positions", () => {
    expect(() => {
      createSourceSpan(-1, 10);
    }).toThrow(RangeError);
  });

  it("rejects reversed positions", () => {
    expect(() => {
      createSourceSpan(10, 5);
    }).toThrow(RangeError);
  });

  it("allows zero-length spans", () => {
    expect(createSourceSpan(5, 5)).toEqual({
      start: 5,
      end: 5
    });
  });

  it("rejects non-integer positions", () => {
    expect(() => {
      createSourceSpan(1.5, 10);
    }).toThrow(RangeError);
  });
});
