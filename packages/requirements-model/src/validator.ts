
import type {
  HumanRequirementsModel,
  Evidence,
  HrmRelation
} from "../../contracts/src/hrm.js";

import type {
  Diagnostic
} from "../../contracts/src/diagnostics.js";

export interface ValidationOptions {
  source?: string;
}

export function validateModel(
  model: HumanRequirementsModel,
  options: ValidationOptions = {}
): Diagnostic[] {
  const diagnostics: Diagnostic[] = [];

  const conceptIds = new Map(
    model.concepts.map(c => [c.id, c])
  );

  const allIds = new Set<string>();

  function report(
    code: string,
    message: string,
    evidence?: Evidence
  ): void {
    diagnostics.push({
      code,
      severity: "error",
      message,
      ...(evidence ? { span: evidence.span } : {})
    });
  }

  function checkId(id: string): void {
    if (allIds.has(id)) {
      report(
        "HU-MOD-002",
        `Duplicate identifier: ${id}`
      );
    }

    allIds.add(id);
  }

  function checkEvidence(
    evidence: Evidence[],
    owner: string
  ): void {
    if (evidence.length === 0) {
      report(
        "HU-MOD-005",
        `Missing source evidence for ${owner}`
      );
      return;
    }

    const seen = new Set<string>();

    for (const item of evidence) {
      const evidenceKey = [
        item.sentenceIndex,
        item.span.start,
        item.span.end
      ].join(":");

      if (seen.has(evidenceKey)) {
        report(
          "HU-MOD-005",
          `Duplicate source evidence for ${owner}`,
          item
        );
      }

      seen.add(evidenceKey);

      if (
        !Number.isSafeInteger(item.sentenceIndex) ||
        item.sentenceIndex < 0 ||
        !Number.isSafeInteger(item.span.start) ||
        !Number.isSafeInteger(item.span.end) ||
        item.span.start < 0 ||
        item.span.end < item.span.start
      ) {
        report(
          "HU-MOD-006",
          `Invalid source span for ${owner}`
        );
        continue;
      }

      if (options.source !== undefined) {
        const actual = options.source.slice(
          item.span.start,
          item.span.end
        );

        if (
          item.span.end > options.source.length ||
          actual !== item.text
        ) {
          report(
            "HU-MOD-006",
            `Source evidence mismatch for ${owner}`,
            item
          );
        }
      }
    }
  }

  function checkConceptReference(
    id: string,
    expectedKind: "actor" | "entity",
    owner: string
  ): void {
    const concept = conceptIds.get(id);

    if (!concept) {
      report(
        "HU-MOD-001",
        `Invalid concept reference "${id}" in ${owner}`
      );
      return;
    }

    if (concept.kind !== expectedKind) {
      report(
        "HU-MOD-003",
        `Expected ${expectedKind} reference in ${owner}, ` +
        `but found ${concept.kind}`
      );
    }
  }

  if (model.schemaVersion !== "1.0.0") {
    report(
      "HU-MOD-007",
      `Unsupported HRM schema version: ${model.schemaVersion}`
    );
  }

  for (const concept of model.concepts) {
    checkId(concept.id);
    checkEvidence(concept.evidence, concept.id);
  }

  const permissions = new Map<
    string,
    Set<string>
  >();

  for (const action of model.actions) {
    checkId(action.id);
    checkEvidence(action.evidence, action.id);

    checkConceptReference(
      action.actorId,
      "actor",
      action.id
    );

    if (action.objectId !== undefined) {
      checkConceptReference(
        action.objectId,
        "entity",
        action.id
      );
    }

    const actionKey = JSON.stringify([
      action.actorId,
      action.verb,
      action.objectId ?? null
    ]);

    const modalities =
      permissions.get(actionKey) ?? new Set<string>();

    modalities.add(action.modality);
    permissions.set(actionKey, modalities);
  }

  for (const [actionKey, modalities] of permissions) {
    if (
      modalities.has("permitted") &&
      modalities.has("prohibited")
    ) {
      report(
        "HU-SEM-003",
        `Conflicting permissions for ${actionKey}`
      );
    }
  }

  for (const relation of model.relations) {
    checkId(relation.id);
    checkEvidence(relation.evidence, relation.id);

    checkConceptReference(
      relation.fromId,
      "entity",
      relation.id
    );

    checkConceptReference(
      relation.toId,
      "entity",
      relation.id
    );

    if (
      relation.type === "specializes" &&
      relation.fromId === relation.toId
    ) {
      report(
        "HU-SEM-004",
        "A concept cannot specialize itself."
      );
    }
  }

  detectInheritanceCycles(
    model.relations,
    conceptIds,
    report
  );

  return diagnostics;
}

function detectInheritanceCycles(
  relations: HrmRelation[],
  concepts: Map<string, unknown>,
  report: (code: string, message: string) => void
): void {
  const graph = new Map<string, string[]>();

  for (const relation of relations) {
    if (
      relation.type !== "specializes" ||
      !concepts.has(relation.fromId) ||
      !concepts.has(relation.toId) ||
      relation.fromId === relation.toId
    ) {
      continue;
    }

    const parents =
      graph.get(relation.fromId) ?? [];

    parents.push(relation.toId);
    graph.set(relation.fromId, parents);
  }

  const visiting = new Set<string>();
  const visited = new Set<string>();
  const reported = new Set<string>();

  function visit(
    node: string,
    path: string[]
  ): void {
    if (visiting.has(node)) {
      const cycleStart = path.indexOf(node);
      const cycle = [
        ...path.slice(cycleStart),
        node
      ];

      const signature = [...new Set(cycle)]
        .sort()
        .join("|");

      if (!reported.has(signature)) {
        reported.add(signature);

        report(
          "HU-SEM-005",
          `Inheritance cycle detected: ${cycle.join(" -> ")}`
        );
      }

      return;
    }

    if (visited.has(node)) return;

    visiting.add(node);

    for (const parent of graph.get(node) ?? []) {
      visit(parent, [...path, node]);
    }

    visiting.delete(node);
    visited.add(node);
  }

  for (const node of [...graph.keys()].sort()) {
    visit(node, []);
  }
}
