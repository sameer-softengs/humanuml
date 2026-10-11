
import type {
  HumanRequirementsModel
} from "../../contracts/src/hrm.js";

import type {
  Diagnostic
} from "../../contracts/src/diagnostics.js";

export function validateModel(
  model: HumanRequirementsModel
): Diagnostic[] {
  const diagnostics: Diagnostic[] = [];

  const conceptIds = new Set<string>();
  const modelIds = new Set<string>();

  function checkId(id: string): void {
    if (modelIds.has(id)) {
      diagnostics.push({
        code: "HU-MOD-002",
        severity: "error",
        message: `Duplicate identifier: ${id}`
      });
    }

    modelIds.add(id);
  }

  for (const concept of model.concepts) {
    checkId(concept.id);
    conceptIds.add(concept.id);
  }

  function checkReference(id: string): void {
    if (!conceptIds.has(id)) {
      diagnostics.push({
        code: "HU-MOD-001",
        severity: "error",
        message: `Invalid concept reference: ${id}`
      });
    }
  }

  const permissions = new Map<string, Set<string>>();

  for (const action of model.actions) {
    checkId(action.id);
    checkReference(action.actorId);

    if (action.objectId) {
      checkReference(action.objectId);
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

  for (const modalities of permissions.values()) {
    if (
      modalities.has("permitted") &&
      modalities.has("prohibited")
    ) {
      diagnostics.push({
        code: "HU-SEM-003",
        severity: "error",
        message:
          "Conflicting explicit permission and prohibition."
      });
    }
  }

  for (const relation of model.relations) {
    checkId(relation.id);
    checkReference(relation.fromId);
    checkReference(relation.toId);

    if (
      relation.type === "specializes" &&
      relation.fromId === relation.toId
    ) {
      diagnostics.push({
        code: "HU-SEM-004",
        severity: "error",
        message: "A concept cannot specialize itself."
      });
    }
  }

  return diagnostics;
}
