
import type {
  DocumentAst
} from "../../contracts/src/ast.js";

import type {
  ConceptKind,
  Evidence
} from "../../contracts/src/hrm.js";

import type {
  Diagnostic
} from "../../contracts/src/diagnostics.js";

import type {
  VocabularyRegistry
} from "../../vocabulary/src/types.js";

import type {
  SemanticResult
} from "./types.js";

export function analyze(
  ast: DocumentAst,
  source: string,
  vocabulary: VocabularyRegistry
): SemanticResult {
  const result: SemanticResult = {
    concepts: [],
    actions: [],
    relations: [],
    diagnostics: [],
    ok: true
  };

  function resolve(
    name: string,
    expected: ConceptKind,
    span: Evidence["span"]
  ): string | undefined {
    const match = vocabulary.lookup(name);

    if (!match || match.kind !== expected) {
      result.diagnostics.push({
        code: "HU-SEM-001",
        severity: "error",
        message:
          `Expected a registered ${expected}: "${name}".`,
        span
      });

      return undefined;
    }

    return match.canonical;
  }

  ast.statements.forEach(statement => {
    // Periods are mandatory sentence boundaries in CE-1.
    const sentenceIndex = (
      source.slice(0, statement.span.start)
        .match(/\./g) ?? []
    ).length;

    const evidence: Evidence = {
      sentenceIndex,
      span: statement.span,
      text: statement.sourceText
    };

    function addConcept(
      name: string,
      kind: ConceptKind
    ): void {
      result.concepts.push({
        name,
        kind,
        evidence
      });
    }

    if (statement.kind === "action") {
      const actor = resolve(
        statement.actor,
        "actor",
        statement.span
      );

      const object = statement.object
        ? resolve(
            statement.object,
            "entity",
            statement.span
          )
        : undefined;

      if (!actor || (statement.object && !object)) {
        return;
      }

      addConcept(actor, "actor");

      if (object) {
        addConcept(object, "entity");
      }

      result.actions.push({
        actor,
        verb: statement.verb,
        modality: statement.modality,
        ...(object ? { object } : {}),
        evidence
      });

      return;
    }

    if (statement.kind === "relation") {
      const from = resolve(
        statement.subject,
        "entity",
        statement.span
      );

      const to = resolve(
        statement.object,
        "entity",
        statement.span
      );

      if (!from || !to) return;

      addConcept(from, "entity");
      addConcept(to, "entity");

      result.relations.push({
        from,
        to,
        type: statement.predicate,
        evidence
      });

      return;
    }

    if (statement.kind === "inheritance") {
      const child = resolve(
        statement.child,
        "entity",
        statement.span
      );

      const parent = resolve(
        statement.parent,
        "entity",
        statement.span
      );

      if (!child || !parent) return;

      addConcept(child, "entity");
      addConcept(parent, "entity");

      result.relations.push({
        from: child,
        to: parent,
        type: "specializes",
        evidence
      });
    }
  });

  result.ok = !result.diagnostics.some(
    diagnostic => diagnostic.severity === "error"
  );

  return result;
}
