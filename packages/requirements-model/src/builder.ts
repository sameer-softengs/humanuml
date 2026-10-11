
import type {
  HumanRequirementsModel,
  HrmConcept,
  HrmAction,
  HrmRelation,
  Evidence,
  ConceptKind
} from "../../contracts/src/hrm.js";

import type {
  SemanticResult
} from "../../semantic-core/src/types.js";

function key(value: string): string {
  return encodeURIComponent(value);
}

function conceptId(
  kind: ConceptKind,
  name: string
): string {
  return `concept:${kind}:${key(name)}`;
}

function addEvidence(
  collection: Evidence[],
  evidence: Evidence
): void {
  if (
    !collection.some(
      item =>
        item.span.start === evidence.span.start &&
        item.span.end === evidence.span.end &&
        item.sentenceIndex === evidence.sentenceIndex
    )
  ) {
    collection.push(evidence);
  }
}

export function buildModel(
  semantic: SemanticResult
): HumanRequirementsModel {
  const concepts = new Map<string, HrmConcept>();
  const actions = new Map<string, HrmAction>();
  const relations = new Map<string, HrmRelation>();

  for (const record of semantic.concepts) {
    const id = conceptId(record.kind, record.name);
    const existing = concepts.get(id);

    if (existing) {
      addEvidence(existing.evidence, record.evidence);
    } else {
      concepts.set(id, {
        id,
        name: record.name,
        kind: record.kind,
        evidence: [record.evidence]
      });
    }
  }

  for (const record of semantic.actions) {
    const actorId = conceptId(
      "actor",
      record.actor
    );

    const objectId = record.object
      ? conceptId("entity", record.object)
      : undefined;

    const id = [
      "action",
      actorId,
      key(record.verb),
      objectId ?? "none",
      record.modality
    ].join(":");

    const existing = actions.get(id);

    if (existing) {
      addEvidence(existing.evidence, record.evidence);
    } else {
      actions.set(id, {
        id,
        actorId,
        verb: record.verb,
        modality: record.modality,
        ...(objectId ? { objectId } : {}),
        evidence: [record.evidence]
      });
    }
  }

  for (const record of semantic.relations) {
    const fromId = conceptId(
      "entity",
      record.from
    );

    const toId = conceptId(
      "entity",
      record.to
    );

    const id = [
      "relation",
      fromId,
      record.type,
      toId
    ].join(":");

    const existing = relations.get(id);

    if (existing) {
      addEvidence(existing.evidence, record.evidence);
    } else {
      relations.set(id, {
        id,
        fromId,
        toId,
        type: record.type,
        evidence: [record.evidence]
      });
    }
  }

  const sortById = <T extends { id: string }>(
    values: Iterable<T>
  ): T[] =>
    [...values].sort((a, b) =>
      a.id < b.id ? -1 : a.id > b.id ? 1 : 0
    );

  return {
    schemaVersion: "1.0.0",
    language: "en",
    grammarVersion: "CE-1",
    concepts: sortById(concepts.values()),
    actions: sortById(actions.values()),
    relations: sortById(relations.values())
  };
}
