
import { describe, expect, it } from "vitest";

import { tokenize } from "../../packages/language-core/src/index";
import { createVocabulary } from "../../packages/vocabulary/src/index";

const vocabulary = createVocabulary({
  actors: ["student", "librarian"],
  entities: ["book", "category"],
  verbs: ["borrow", "manage"],
  plurals: {
    books: "book"
  },
  verbForms: {
    manages: "manage"
  }
});

describe("HumanUML Lexer", () => {
  it("tokenizes a permission statement", () => {
    const result = tokenize(
      "A student can borrow books.",
      vocabulary
    );

    expect(result.tokens.map(token => token.kind)).toEqual([
      "article",
      "noun",
      "modal",
      "verb",
      "noun",
      "punctuation"
    ]);

    expect(result.tokens[4]?.normalized).toBe("book");
    expect(result.unknown).toHaveLength(0);
  });

  it("preserves exact source positions", () => {
    const result = tokenize(
      "A student can borrow books.",
      vocabulary
    );

    expect(result.tokens[1]?.span).toEqual({
      start: 2,
      end: 9
    });
  });

  it("recognizes multi-word relations", () => {
    const result = tokenize(
      "A book belongs to a category.",
      vocabulary
    );

    expect(
      result.tokens.some(
        token => token.normalized === "belongs to"
      )
    ).toBe(true);
  });

  it("reports unknown vocabulary", () => {
    const result = tokenize(
      "A dragon can borrow books.",
      vocabulary
    );

    expect(result.unknown.map(token => token.raw))
      .toContain("dragon");
  });

  it("handles uppercase input", () => {
    const result = tokenize(
      "A STUDENT CAN BORROW BOOKS.",
      vocabulary
    );

    expect(result.unknown).toHaveLength(0);
  });
});
