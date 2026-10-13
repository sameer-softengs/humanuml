
import { describe, expect, it } from "vitest";

import {
  tokenize,
  parse
} from "../../packages/language-core/src/index.js";

import {
  createVocabulary
} from "../../packages/vocabulary/src/index.js";

import {
  analyze
} from "../../packages/semantic-core/src/index.js";

import {
  buildModel,
  validateModel
} from "../../packages/requirements-model/src/index.js";

const vocabulary = createVocabulary({
  actors: ["student", "librarian", "guest"],
  entities: ["book", "category", "manager", "employee"],
  verbs: ["borrow", "manage", "delete"],
  plurals: {
    books: "book"
  },
  verbForms: {
    manages: "manage"
  }
});

function compileModel(text: string) {
  const lexical = tokenize(text, vocabulary);
  const parsed = parse(lexical.tokens, text);

  if (!parsed.ok) {
    throw new Error("Unexpected parser error");
  }

  const semantic = analyze(
    parsed.ast,
    text,
    vocabulary
  );

  const model = buildModel(semantic);

  return {
    semantic,
    model,
    diagnostics: validateModel(model)
  };
}

describe("HumanUML Semantic Engine", () => {
  it("extracts actors, entities, and actions", () => {
    const { model } = compileModel(
      "A student can borrow books."
    );

    expect(model.concepts).toHaveLength(2);
    expect(model.actions).toHaveLength(1);

    expect(model.actions[0]?.modality)
      .toBe("permitted");
  });

  it("merges repeated requirements", () => {
    const { model } = compileModel(
      "A student can borrow books. " +
      "A student can borrow books."
    );

    expect(model.actions).toHaveLength(1);
    expect(model.actions[0]?.evidence).toHaveLength(2);
  });

  it("preserves source evidence", () => {
    const { model } = compileModel(
      "A student can borrow books."
    );

    expect(model.actions[0]?.evidence[0]?.text)
      .toBe("A student can borrow books");

    expect(model.actions[0]?.evidence[0]?.sentenceIndex)
      .toBe(0);
  });

  it("extracts relationships", () => {
    const { model } = compileModel(
      "A book belongs to a category."
    );

    expect(model.relations).toHaveLength(1);
    expect(model.relations[0]?.type)
      .toBe("belongs_to");
  });

  it("extracts inheritance", () => {
    const { model } = compileModel(
      "A manager is a type of employee."
    );

    expect(model.relations[0]?.type)
      .toBe("specializes");
  });

  it("detects permission conflicts", () => {
    const { diagnostics } = compileModel(
      "A student can borrow books. " +
      "A student cannot borrow books."
    );

    expect(
      diagnostics.some(d => d.code === "HU-SEM-003")
    ).toBe(true);
  });

  it("generates deterministic model output", () => {
    const input = "A student can borrow books.";

    const first = compileModel(input).model;
    const second = compileModel(input).model;

    expect(first).toEqual(second);
  });

  it("rejects an actor used as a relation entity", () => {
    const text = "A student belongs to a category.";

    const lexed = tokenize(text, vocabulary);
    const parsed = parse(lexed.tokens, text);

    expect(parsed.ok).toBe(true);

    const semantic = analyze(
      parsed.ast,
      text,
      vocabulary
    );

    expect(semantic.ok).toBe(false);
    expect(semantic.diagnostics[0]?.code)
      .toBe("HU-SEM-001");
  });
});
