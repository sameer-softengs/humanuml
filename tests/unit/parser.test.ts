
import { describe, expect, it } from "vitest";

import {
  tokenize,
  parse
} from "../../packages/language-core/src/index";

import {
  createVocabulary
} from "../../packages/vocabulary/src/index";

const vocabulary = createVocabulary({
  actors: [
    "student",
    "librarian",
    "administrator",
    "guest"
  ],
  entities: [
    "book",
    "category",
    "order",
    "product",
    "manager",
    "employee"
  ],
  verbs: [
    "borrow",
    "manage",
    "approve",
    "delete",
    "register"
  ],
  plurals: {
    books: "book",
    orders: "order",
    products: "product"
  },
  verbForms: {
    manages: "manage"
  }
});

function compile(text: string) {
  const lexical = tokenize(text, vocabulary);
  return parse(lexical.tokens, text);
}

describe("HumanUML CE-1 Parser", () => {
  it("parses permissions", () => {
    const result = compile(
      "A student can borrow books."
    );

    expect(result.ok).toBe(true);

    expect(result.ast.statements[0]).toMatchObject({
      kind: "action",
      actor: "student",
      verb: "borrow",
      object: "book",
      modality: "permitted"
    });
  });

  it("parses asserted actions", () => {
    const result = compile(
      "A librarian manages books."
    );

    expect(result.ok).toBe(true);

    expect(result.ast.statements[0]).toMatchObject({
      kind: "action",
      actor: "librarian",
      verb: "manage",
      object: "book",
      modality: "asserted"
    });
  });

  it("parses prohibitions", () => {
    const result = compile(
      "A guest cannot delete orders."
    );

    expect(result.ok).toBe(true);

    expect(result.ast.statements[0]).toMatchObject({
      modality: "prohibited",
      verb: "delete"
    });
  });

  it("parses obligations", () => {
    const result = compile(
      "A student must register."
    );

    expect(result.ok).toBe(true);

    expect(result.ast.statements[0]).toMatchObject({
      modality: "required",
      verb: "register"
    });
  });

  it("parses belongs-to relationships", () => {
    const result = compile(
      "A book belongs to a category."
    );

    expect(result.ok).toBe(true);

    expect(result.ast.statements[0]).toMatchObject({
      kind: "relation",
      subject: "book",
      predicate: "belongs_to",
      object: "category"
    });
  });

  it("parses contains relationships", () => {
    const result = compile(
      "An order contains products."
    );

    expect(result.ok).toBe(true);

    expect(result.ast.statements[0]).toMatchObject({
      kind: "relation",
      subject: "order",
      predicate: "contains",
      object: "product"
    });
  });

  it("parses inheritance", () => {
    const result = compile(
      "A manager is a type of employee."
    );

    expect(result.ok).toBe(true);

    expect(result.ast.statements[0]).toMatchObject({
      kind: "inheritance",
      child: "manager",
      parent: "employee"
    });
  });

  it("rejects unknown vocabulary", () => {
    const result = compile(
      "A dragon can borrow books."
    );

    expect(result.ok).toBe(false);
    expect(result.diagnostics).toHaveLength(1);
  });

  it("rejects missing terminators", () => {
    const result = compile(
      "A student can borrow books"
    );

    expect(result.ok).toBe(false);

    expect(result.diagnostics[0]?.code)
      .toBe("HU-SYN-002");
  });

  it("rejects unsupported conditions", () => {
    const result = compile(
      "A student can borrow books if approved."
    );

    expect(result.ok).toBe(false);
  });

  it("parses multiple sentences", () => {
    const result = compile(
      "A student can borrow books. " +
      "A librarian manages books."
    );

    expect(result.ok).toBe(true);
    expect(result.ast.statements).toHaveLength(2);
  });

  it("keeps valid sentences after an error", () => {
    const result = compile(
      "A dragon can borrow books. " +
      "A student can borrow books."
    );

    expect(result.ok).toBe(false);
    expect(result.ast.statements).toHaveLength(1);
  });
});
