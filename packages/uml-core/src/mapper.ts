import type {
  Diagnostic,
  Evidence,
  HumanRequirementsModel,
  HrmAction,
  HrmConcept
} from "./contracts.js";
import {
  UML_SCHEMA_VERSION,
  type MappingResult,
  type Traceability,
  type UmlActor,
  type UmlAssociation,
  type UmlGeneralization,
  type UmlProhibitedAction,
  type UmlUseCase,
  type UseCaseDiagram
} from "./contracts.js";

function encode(value: string): string {
  return encodeURIComponent(value);
}

function titleCase(value: string): string {
  return value
    .trim()
    .split(/\s+/u)
    .map(word => word.length === 0
      ? word
      : `${word[0]!.toUpperCase()}${word.slice(1)}`)
    .join(" ");
}

function useCaseLabel(action: HrmAction, concepts: Map<string, HrmConcept>): string | undefined {
  const verb = action.verb.trim();
  if (!verb) return undefined;
  const object = action.objectId === undefined
    ? undefined
    : concepts.get(action.objectId);
  if (action.objectId !== undefined && (!object || object.kind !== "entity")) {
    return undefined;
  }
  return [titleCase(verb), object?.name].filter(Boolean).join(" ");
}

function evidenceKey(evidence: Evidence): string {
  return `${evidence.sentenceIndex}:${evidence.span.start}:${evidence.span.end}`;
}

function mergeEvidence(target: Evidence[], values: Evidence[]): void {
  const seen = new Set(target.map(evidenceKey));
  for (const evidence of values) {
    const key = evidenceKey(evidence);
    if (!seen.has(key)) {
      target.push(evidence);
      seen.add(key);
    }
  }
  target.sort((a, b) =>
    a.span.start - b.span.start || a.span.end - b.span.end ||
    a.sentenceIndex - b.sentenceIndex
  );
}

function diagnostic(code: string, message: string, span?: Evidence["span"]): Diagnostic {
  return {
    code,
    severity: "error",
    message,
    ...(span ? { span } : {})
  };
}

function addTrace(trace: Map<string, Set<string>>, sourceId: string, diagramId: string): void {
  const values = trace.get(sourceId) ?? new Set<string>();
  values.add(diagramId);
  trace.set(sourceId, values);
}

function traceability(
  hrmToDiagram: Map<string, Set<string>>,
  diagramToHrm: Map<string, Set<string>>
): Traceability {
  const record = (source: Map<string, Set<string>>): Record<string, string[]> =>
    Object.fromEntries(
      [...source.entries()]
        .sort(([a], [b]) => a.localeCompare(b, "en"))
        .map(([key, values]) => [key, [...values].sort((a, b) => a.localeCompare(b, "en"))])
    );
  return {
    hrmToDiagram: record(hrmToDiagram),
    diagramToHrm: record(diagramToHrm)
  };
}

export function mapUseCaseDiagram(
  model: HumanRequirementsModel,
  options: { systemName?: string } = {}
): MappingResult {
  const diagnostics: Diagnostic[] = [];
  const concepts = new Map(model.concepts.map(concept => [concept.id, concept]));
  const actors = new Map<string, UmlActor>();
  const useCases = new Map<string, UmlUseCase>();
  const associations = new Map<string, UmlAssociation>();
  const generalizations = new Map<string, UmlGeneralization>();
  const prohibitedActions: UmlProhibitedAction[] = [];
  const supportedKeys = new Set<string>();
  const prohibitedKeys = new Set<string>();
  const hrmToDiagram = new Map<string, Set<string>>();
  const diagramToHrm = new Map<string, Set<string>>();

  for (const concept of model.concepts) {
    if (concept.kind !== "actor") continue;
    const id = `actor:${encode(concept.id)}`;
    actors.set(id, {
      id,
      name: concept.name,
      sourceConceptId: concept.id,
      evidence: [...concept.evidence]
    });
    addTrace(hrmToDiagram, concept.id, id);
    addTrace(diagramToHrm, id, concept.id);
  }

  for (const action of model.actions) {
    const actor = concepts.get(action.actorId);
    if (!actor || actor.kind !== "actor") {
      diagnostics.push(diagnostic("HU-UML-001", `Invalid actor reference in action "${action.id}".`, action.evidence[0]?.span));
      continue;
    }

    const actorDiagramId = `actor:${encode(actor.id)}`;

    const label = useCaseLabel(action, concepts);
    if (!label) {
      diagnostics.push(diagnostic("HU-UML-004", `Unsupported action mapping for "${action.id}".`, action.evidence[0]?.span));
      continue;
    }

    const useCaseId = `usecase:${encode(action.verb)}:${encode(action.objectId === undefined ? "" : concepts.get(action.objectId)?.name ?? "")}`;
    const associationId = `association:${encode(actorDiagramId)}:${encode(useCaseId)}`;
    const semanticKey = `${actorDiagramId}|${useCaseId}`;

    if (action.modality === "prohibited") {
      prohibitedKeys.add(semanticKey);
      prohibitedActions.push({
        actionId: action.id,
        actorId: actorDiagramId,
        useCaseId,
        evidence: [...action.evidence]
      });
      addTrace(hrmToDiagram, action.id, useCaseId);
      addTrace(diagramToHrm, useCaseId, action.id);
      continue;
    }

    supportedKeys.add(semanticKey);
    const existingUseCase = useCases.get(useCaseId);
    if (existingUseCase) {
      existingUseCase.sourceActionIds.push(action.id);
      mergeEvidence(existingUseCase.evidence, action.evidence);
    } else {
      useCases.set(useCaseId, {
        id: useCaseId,
        label,
        sourceActionIds: [action.id],
        evidence: [...action.evidence]
      });
    }

    const existingAssociation = associations.get(associationId);
    if (existingAssociation) {
      existingAssociation.sourceActionIds.push(action.id);
      mergeEvidence(existingAssociation.evidence, action.evidence);
    } else {
      associations.set(associationId, {
        id: associationId,
        actorId: actorDiagramId,
        useCaseId,
        sourceActionIds: [action.id],
        evidence: [...action.evidence]
      });
    }
    addTrace(hrmToDiagram, action.id, useCaseId);
    addTrace(diagramToHrm, useCaseId, action.id);
    addTrace(hrmToDiagram, action.id, associationId);
    addTrace(diagramToHrm, associationId, action.id);
  }

  for (const key of prohibitedKeys) {
    if (supportedKeys.has(key)) {
      diagnostics.push(diagnostic("HU-UML-004", `Prohibited and supported actions map to the same actor/use case: "${key}".`));
    }
  }

  for (const relation of model.relations) {
    if (relation.type !== "specializes") continue;
    const child = concepts.get(relation.fromId);
    const parent = concepts.get(relation.toId);
    if (!child || !parent) {
      diagnostics.push(diagnostic("HU-UML-001", `Invalid actor generalization reference in relation "${relation.id}".`, relation.evidence[0]?.span));
      continue;
    }
    if (child.kind !== "actor" || parent.kind !== "actor") continue;
    const childId = `actor:${encode(child.id)}`;
    const parentId = `actor:${encode(parent.id)}`;
    const id = `generalization:${encode(childId)}:${encode(parentId)}`;
    generalizations.set(id, {
      id,
      childActorId: childId,
      parentActorId: parentId,
      sourceRelationId: relation.id,
      evidence: [...relation.evidence]
    });
    addTrace(hrmToDiagram, relation.id, id);
    addTrace(diagramToHrm, id, relation.id);
  }

  const sortById = <T extends { id: string }>(values: Iterable<T>): T[] =>
    [...values].sort((a, b) => a.id.localeCompare(b.id, "en"));
  for (const actor of actors.values()) actor.evidence.sort((a, b) => a.span.start - b.span.start);
  for (const useCase of useCases.values()) useCase.sourceActionIds.sort();
  for (const association of associations.values()) association.sourceActionIds.sort();
  prohibitedActions.sort((a, b) => a.actionId.localeCompare(b.actionId, "en"));

  const diagram: UseCaseDiagram = {
    schemaVersion: UML_SCHEMA_VERSION,
    kind: "use-case",
    ...(options.systemName?.trim() ? { systemName: options.systemName.trim() } : {}),
    actors: sortById(actors.values()),
    useCases: sortById(useCases.values()),
    associations: sortById(associations.values()),
    generalizations: sortById(generalizations.values()),
    prohibitedActions,
    traceability: traceability(hrmToDiagram, diagramToHrm)
  };

  return {
    ok: !diagnostics.some(item => item.severity === "error"),
    diagram,
    diagnostics
  };
}
