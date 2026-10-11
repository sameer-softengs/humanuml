
import { describe, expect, it } from "vitest";

import {
  createCompiler
} from "../../packages/core/src/index.js";

import {
  createVocabulary
} from "../../packages/vocabulary/src/index.js";

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

const compiler = createCompiler();

describe("HumanUML Public Compiler", () => {
  it("compiles a valid requirements document", () => {
    const result = compiler.compile(
      "A student can borrow books. " +
      "A book belongs to a category.",
      { vocabulary }
    );

    expect(result.ok).toBe(true);
    expect(result.model?.concepts).toHaveLength(3);
    expect(result.model?.actions).toHaveLength(1);
    expect(result.model?.relations).toHaveLength(1);
  });

  it("rejects empty input", () => {
    const result = compiler.compile(
      "  ",
      { vocabulary }
    );

    expect(result.ok).toBe(false);
    expect(result.diagnostics[0]?.code)
      .toBe("HU-INPUT-001");
  });

  it("rejects unknown vocabulary", () => {
    const result = compiler.compile(
      "A dragon can borrow books.",
      { vocabulary }
    );

    expect(result.ok).toBe(false);
    expect(result.model).toBeUndefined();
  });

  it("allows partial models in non-strict mode", () => {
    const result = compiler.compile(
      "A student can borrow books. " +
      "A dragon can borrow books.",
      {
        vocabulary,
        strict: false
      }
    );

    expect(result.ok).toBe(false);
    expect(result.model?.actions).toHaveLength(1);
  });

  it("rejects missing sentence punctuation", () => {
    const result = compiler.compile(
      "A student can borrow books",
      { vocabulary }
    );

    expect(result.ok).toBe(false);
    expect(result.diagnostics.some(
      diagnostic =>
        diagnostic.code === "HU-SYN-002"
    )).toBe(true);
  });

  it("detects explicit permission conflicts", () => {
    const result = compiler.compile(
      "A student can borrow books. " +
      "A student cannot borrow books.",
      { vocabulary }
    );

    expect(result.ok).toBe(false);
    expect(result.diagnostics.some(
      diagnostic =>
        diagnostic.code === "HU-SEM-003"
    )).toBe(true);
  });

  it("produces deterministic results", () => {
    const input = "A student can borrow books.";

    const first = compiler.compile(
      input, { vocabulary }
    );

    const second = compiler.compile(
      input, { vocabulary }
    );

    expect(first).toEqual(second);
  });
});

it("rejects circular inheritance through the compiler", () => {
  const inheritanceVocabulary = createVocabulary({
    actors: [],
    entities: ["manager", "employee", "supervisor"],
    verbs: []
  });

  const result = compiler.compile(
    "A manager is a type of employee. " +
    "An employee is a type of supervisor. " +
    "A supervisor is a type of manager.",
    { vocabulary: inheritanceVocabulary }
  );

  expect(result.ok).toBe(false);

  expect(
    result.diagnostics.some(
      d => d.code === "HU-SEM-005"
    )
  ).toBe(true);

  expect(result.model).toBeUndefined();
});
