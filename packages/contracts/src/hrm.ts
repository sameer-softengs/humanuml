
import type { SourceSpan } from "./source.js";
import type { ActionModality } from "./ast.js";

export type ConceptKind = "actor" | "entity";

export interface Evidence {
  sentenceIndex: number;
  span: SourceSpan;
  text: string;
}

export interface HrmConcept {
  id: string;
  name: string;
  kind: ConceptKind;
  evidence: Evidence[];
}

export interface HrmAction {
  id: string;
  actorId: string;
  verb: string;
  objectId?: string;
  modality: ActionModality;
  evidence: Evidence[];
}

export interface HrmRelation {
  id: string;
  fromId: string;
  toId: string;
  type: "belongs_to" | "contains" | "specializes";
  evidence: Evidence[];
}

export interface HumanRequirementsModel {
  schemaVersion: "1.0.0";
  language: "en";
  grammarVersion: "CE-1";
  concepts: HrmConcept[];
  actions: HrmAction[];
  relations: HrmRelation[];
}
