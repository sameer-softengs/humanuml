import { describe, expect, it } from "vitest";

import { createCompiler, createVocabulary } from "../../packages/core/src/index.js";
import {
  createUmlGenerator,
  layoutUseCaseDiagram,
  mapUseCaseDiagram,
  renderUseCaseSvg,
  validateUseCaseDiagram
} from "../../packages/uml-core/src/index.js";

function model(source: string) {
  const vocabulary = createVocabulary({
    actors: ["student", "librarian"],
    entities: ["book"],
    verbs: ["borrow", "manage"],
    plurals: { books: "book" },
    verbForms: { manages: "manage" }
  });
  const result = createCompiler().compile(source, { vocabulary, grammarVersion: "CE-1", strict: false });
  if (!result.model) throw new Error(JSON.stringify(result.diagnostics));
  return result.model;
}

describe("deterministic UML use case generation", () => {
  it("maps actors, actions, duplicate evidence, and traceability", () => {
    const hrm = model("A student can borrow books. A student can borrow books. A librarian manages books.");
    const first = mapUseCaseDiagram(hrm, { systemName: "Library" });
    const second = mapUseCaseDiagram(hrm, { systemName: "Library" });
    expect(first.ok).toBe(true);
    expect(JSON.stringify(first.diagram)).toBe(JSON.stringify(second.diagram));
    expect(first.diagram?.actors).toHaveLength(2);
    expect(first.diagram?.useCases).toHaveLength(2);
    expect(first.diagram?.associations).toHaveLength(2);
    expect(first.diagram?.useCases[0]?.evidence.length).toBe(2);
    expect(validateUseCaseDiagram(first.diagram!)).toEqual([]);
  });

  it("does not create a positive association for a prohibition", () => {
    const hrm = model("A student cannot borrow books.");
    const result = mapUseCaseDiagram(hrm);
    expect(result.ok).toBe(true);
    expect(result.diagram?.associations).toHaveLength(0);
    expect(result.diagram?.prohibitedActions).toHaveLength(1);
    expect(validateUseCaseDiagram(result.diagram!)).toEqual([]);
  });

  it("rejects a conflict without enabling the prohibition", () => {
    const hrm = model("A student can borrow books. A student cannot borrow books.");
    const result = mapUseCaseDiagram(hrm);
    expect(result.ok).toBe(false);
    expect(result.diagnostics).toEqual(expect.arrayContaining([
      expect.objectContaining({ code: "HU-UML-004", severity: "error" })
    ]));
    expect(result.diagram?.associations).toHaveLength(1);
  });

  it("lays out and renders deterministic, escaped SVG", () => {
    const hrm = model("A student can borrow books.");
    const diagram = mapUseCaseDiagram(hrm, { systemName: "Library <System>" }).diagram!;
    const layout = layoutUseCaseDiagram(diagram);
    expect(layout.ok).toBe(true);
    expect(layout.layout?.width).toBeGreaterThan(0);
    const first = renderUseCaseSvg(diagram, layout.layout!);
    const second = renderUseCaseSvg(diagram, layout.layout!);
    expect(first.svg).toBe(second.svg);
    expect(first.svg).toContain("&lt;System&gt;");
    expect(first.svg).not.toContain("<script");
    expect(first.svg).toContain("<title");
    expect(first.svg).toContain("<ellipse");
  });

  it("exposes the headless generator in SVG and JSON modes", () => {
    const hrm = model("A student can borrow books.");
    const generator = createUmlGenerator();
    const svg = generator.generateUseCase(hrm, { systemName: "Library", format: "svg" });
    const json = generator.generateUseCase(hrm, { systemName: "Library", format: "json" });
    expect(svg.ok).toBe(true);
    expect(svg.svg).toContain("<svg");
    expect(json.ok).toBe(true);
    expect(JSON.parse(json.json!)).toMatchObject({ kind: "use-case", schemaVersion: "0.2.0" });
  });

  it("rejects unsafe layout configuration", () => {
    const diagram = mapUseCaseDiagram(model("A student can borrow books.")).diagram!;
    const result = layoutUseCaseDiagram(diagram, { minWidth: Number.NaN });
    expect(result.ok).toBe(false);
    expect(result.diagnostics[0]?.code).toBe("HU-UML-007");
  });
});
