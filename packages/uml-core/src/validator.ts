import type { Diagnostic } from "../../contracts/src/diagnostics.js";
import {
  UML_SCHEMA_VERSION,
  type UseCaseDiagram
} from "./contracts.js";

function error(code: string, message: string): Diagnostic {
  return { code, severity: "error", message };
}

export function validateUseCaseDiagram(diagram: UseCaseDiagram): Diagnostic[] {
  const diagnostics: Diagnostic[] = [];
  if (diagram.schemaVersion !== UML_SCHEMA_VERSION) {
    diagnostics.push(error("HU-UML-006", `Unsupported diagram schema version: ${diagram.schemaVersion}.`));
  }

  const ids = new Set<string>();
  const addId = (id: string) => {
    if (ids.has(id)) diagnostics.push(error("HU-UML-003", `Duplicate diagram element ID: ${id}.`));
    ids.add(id);
  };
  const actors = new Set(diagram.actors.map(actor => actor.id));
  const useCases = new Set(diagram.useCases.map(useCase => useCase.id));
  const prohibitedUseCases = new Set(diagram.prohibitedActions.map(action => action.useCaseId));

  for (const actor of diagram.actors) {
    addId(actor.id);
    if (!actor.name.trim()) diagnostics.push(error("HU-UML-004", `Actor ${actor.id} has an empty name.`));
    if (!actor.sourceConceptId) diagnostics.push(error("HU-UML-005", `Actor ${actor.id} has invalid traceability.`));
    for (const evidence of actor.evidence) {
      if (evidence.span.start < 0 || evidence.span.end < evidence.span.start) {
        diagnostics.push(error("HU-UML-005", `Actor ${actor.id} has invalid evidence.`));
      }
    }
  }
  for (const useCase of diagram.useCases) {
    addId(useCase.id);
    if (!useCase.label.trim()) diagnostics.push(error("HU-UML-004", `Use case ${useCase.id} has an empty label.`));
    if (useCase.sourceActionIds.length === 0) diagnostics.push(error("HU-UML-005", `Use case ${useCase.id} has no source action.`));
  }
  for (const association of diagram.associations) {
    addId(association.id);
    if (!actors.has(association.actorId)) diagnostics.push(error("HU-UML-001", `Association ${association.id} references missing actor ${association.actorId}.`));
    if (!useCases.has(association.useCaseId)) diagnostics.push(error("HU-UML-002", `Association ${association.id} references missing use case ${association.useCaseId}.`));
    if (association.sourceActionIds.length === 0) diagnostics.push(error("HU-UML-005", `Association ${association.id} has no source action.`));
  }
  const associationKeys = new Set<string>();
  for (const association of diagram.associations) {
    const key = `${association.actorId}|${association.useCaseId}`;
    if (associationKeys.has(key)) diagnostics.push(error("HU-UML-003", `Duplicate actor/use case association: ${key}.`));
    associationKeys.add(key);
  }
  for (const generalization of diagram.generalizations) {
    addId(generalization.id);
    if (!actors.has(generalization.childActorId) || !actors.has(generalization.parentActorId)) {
      diagnostics.push(error("HU-UML-001", `Generalization ${generalization.id} references a missing actor.`));
    }
    if (generalization.childActorId === generalization.parentActorId) {
      diagnostics.push(error("HU-UML-004", `Actor generalization ${generalization.id} is self-referential.`));
    }
  }
  for (const prohibited of diagram.prohibitedActions) {
    if (!actors.has(prohibited.actorId)) diagnostics.push(error("HU-UML-001", `Prohibited action ${prohibited.actionId} references a missing actor.`));
    if (!prohibited.useCaseId) diagnostics.push(error("HU-UML-002", `Prohibited action ${prohibited.actionId} has no use case reference.`));
  }
  for (const [sourceId, diagramIds] of Object.entries(diagram.traceability.hrmToDiagram)) {
    if (!sourceId || diagramIds.length === 0) diagnostics.push(error("HU-UML-005", "Invalid HRM-to-diagram traceability entry."));
    for (const diagramId of diagramIds) {
      if (!ids.has(diagramId) && !diagramId.startsWith("usecase:")) {
        diagnostics.push(error("HU-UML-005", `Traceability references missing diagram element ${diagramId}.`));
      }
    }
  }
  for (const [diagramId, sourceIds] of Object.entries(diagram.traceability.diagramToHrm)) {
    if ((!ids.has(diagramId) && !prohibitedUseCases.has(diagramId)) || sourceIds.length === 0) diagnostics.push(error("HU-UML-005", `Invalid diagram-to-HRM traceability entry for ${diagramId}.`));
  }
  return diagnostics;
}
