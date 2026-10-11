
import type { SourceSpan } from "./source.js";

export interface AstBase {
  span: SourceSpan;
  sourceText: string;
}

export type ActionModality =
  | "asserted"
  | "permitted"
  | "required"
  | "prohibited";

export interface ActionStatement extends AstBase {
  kind: "action";
  actor: string;
  verb: string;
  object?: string;
  modality: ActionModality;
}

export interface RelationStatement extends AstBase {
  kind: "relation";
  subject: string;
  predicate: "belongs_to" | "contains";
  object: string;
}

export interface InheritanceStatement extends AstBase {
  kind: "inheritance";
  child: string;
  parent: string;
}

export type AstStatement =
  | ActionStatement
  | RelationStatement
  | InheritanceStatement;

export interface DocumentAst {
  kind: "document";
  statements: AstStatement[];
}
