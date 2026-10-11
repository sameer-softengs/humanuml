
import { describe, expect, it } from "vitest";
import { createVocabulary } from "../../packages/vocabulary/src/index";

const createTestRegistry = () =>
  createVocabulary({
    actors: ["student", "administrator"],
    entities: ["book", "order"],
    verbs: ["borrow", "manage", "approve"],
    aliases: {
      admin: "administrator"
    },
    plurals: {
      books: "book",
      orders: "order"
    },
    verbForms: {
      manages: "manage",
      approves: "approve"
    }
  });

describe("HumanUML Vocabulary Registry", () => {
  it("recognizes actors", () => {
    const registry = createTestRegistry();

    expect(registry.lookup("student")).toEqual({
      input: "student",
      canonical: "student",
      kind: "actor"
    });
  });

  it("resolves aliases", () => {
    expect(createTestRegistry().lookup("ADMIN")?.canonical)
      .toBe("administrator");
  });

  it("normalizes plural forms", () => {
    expect(createTestRegistry().lookup("books")?.canonical)
      .toBe("book");
  });

  it("recognizes verb forms", () => {
    expect(createTestRegistry().lookup("manages")?.canonical)
      .toBe("manage");
  });

  it("rejects unknown words", () => {
    expect(createTestRegistry().lookup("dragon"))
      .toBeUndefined();
  });

  it("detects conflicting declarations", () => {
    expect(() =>
      createVocabulary({
        actors: ["student"],
        entities: ["student"],
        verbs: []
      })
    ).toThrow("Conflicting vocabulary entry");
  });

  it("rejects unknown alias targets", () => {
    expect(() =>
      createVocabulary({
        actors: ["student"],
        entities: [],
        verbs: [],
        aliases: {
          learner: "unknown"
        }
      })
    ).toThrow("Unknown canonical vocabulary entry");
  });

  it("returns deterministic results", () => {
    const first = createTestRegistry().getAll();
    const second = createTestRegistry().getAll();

    expect(first).toEqual(second);
  });
});

it("rejects reserved grammar keywords", () => {
  expect(() =>
    createVocabulary({
      actors: ["can"],
      entities: [],
      verbs: []
    })
  ).toThrow("Reserved grammar keyword");
});
