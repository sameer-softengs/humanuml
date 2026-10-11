
import { describe, expect, it } from "vitest";

import {
  createCompiler,
  createVocabulary
} from "../../packages/core/src/index.js";

const vocabulary = createVocabulary({
  actors: ["student", "library member"],
  entities: ["book", "category"],
  verbs: ["borrow"],
  plurals: {
    books: "book"
  }
});

const compiler = createCompiler();

function compile(source: string) {
  return compiler.compile(source, {
    vocabulary,
    strict: true
  });
}

describe("HumanUML CE-1 Grammar Hardening", () => {
  it("rejects consecutive periods", () => {
    expect(
      compile("A student can borrow books..").ok
    ).toBe(false);
  });

  it("rejects unknown punctuation", () => {
    expect(
      compile("A student can borrow books!").ok
    ).toBe(false);
  });

  it("rejects missing terminators", () => {
    expect(
      compile("A student can borrow books").ok
    ).toBe(false);
  });

  it("rejects unsupported conjunctions", () => {
    expect(
      compile(
        "A student can borrow books and return books."
      ).ok
    ).toBe(false);
  });

  it("rejects an unknown actor", () => {
    expect(
      compile("A dragon can borrow books.").ok
    ).toBe(false);
  });

  it("recognizes multi-word actors", () => {
    const result = compile(
      "A library member can borrow books."
    );

    expect(result.ok).toBe(true);
    expect(
      result.model?.concepts.some(
        concept => concept.name === "library member"
      )
    ).toBe(true);
  });

  it("preserves source positions", () => {
    const text = "A student can borrow books.";
    const result = compile(text);

    expect(result.ok).toBe(true);

    const span =
      result.model?.actions[0]?.evidence[0]?.span;

    expect(span).toBeDefined();

    if (span) {
      expect(
        text.slice(span.start, span.end)
      ).toBe("A student can borrow books");
    }
  });
});
