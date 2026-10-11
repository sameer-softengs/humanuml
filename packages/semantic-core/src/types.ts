
import type {
  ActionModality
} from "../../contracts/src/ast.js";

import type {
  ConceptKind,
  Evidence
} from "../../contracts/src/hrm.js";

import type {
  Diagnostic
} from "../../contracts/src/diagnostics.js";

export interface SemanticConcept {
  name: string;
  kind: ConceptKind;
  evidence: Evidence;
}

export interface SemanticAction {
  actor: string;
  verb: string;
  object?: string;
  modality: ActionModality;
  evidence: Evidence;
}

export interface SemanticRelation {
  from: string;
  to: string;
  type: "belongs_to" | "contains" | "specializes";
  evidence: Evidence;
}

export interface SemanticResult {
  concepts: SemanticConcept[];
  actions: SemanticAction[];
  relations: SemanticRelation[];
  diagnostics: Diagnostic[];
  ok: boolean;
}
