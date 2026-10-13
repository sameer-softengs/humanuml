import type {
  Diagnostic,
  Evidence,
  HumanRequirementsModel,
  HrmAction,
  HrmConcept,
  SourceSpan
} from "../../contracts/src/index.js";

export const UML_SCHEMA_VERSION = "0.2.0" as const;

export interface Traceability {
  hrmToDiagram: Record<string, string[]>;
  diagramToHrm: Record<string, string[]>;
}

export interface UmlActor {
  id: string;
  name: string;
  sourceConceptId: string;
  evidence: Evidence[];
}

export interface UmlUseCase {
  id: string;
  label: string;
  sourceActionIds: string[];
  evidence: Evidence[];
}

export interface UmlAssociation {
  id: string;
  actorId: string;
  useCaseId: string;
  sourceActionIds: string[];
  evidence: Evidence[];
}

export interface UmlGeneralization {
  id: string;
  childActorId: string;
  parentActorId: string;
  sourceRelationId: string;
  evidence: Evidence[];
}

export interface UmlProhibitedAction {
  actionId: string;
  actorId: string;
  useCaseId: string;
  evidence: Evidence[];
}

export interface UseCaseDiagram {
  schemaVersion: typeof UML_SCHEMA_VERSION;
  kind: "use-case";
  systemName?: string;
  actors: UmlActor[];
  useCases: UmlUseCase[];
  associations: UmlAssociation[];
  generalizations: UmlGeneralization[];
  prohibitedActions: UmlProhibitedAction[];
  traceability: Traceability;
}

export interface MappingResult {
  ok: boolean;
  diagram?: UseCaseDiagram;
  diagnostics: Diagnostic[];
}

export interface DiagramValidationOptions {
  sourceLength?: number;
}

export interface LayoutOptions {
  horizontalSpacing?: number;
  verticalSpacing?: number;
  nodePadding?: number;
  fontSize?: number;
  systemPadding?: number;
  minWidth?: number;
  minHeight?: number;
  maxElements?: number;
}

export interface LayoutPoint {
  x: number;
  y: number;
}

export interface LayoutSize {
  width: number;
  height: number;
}

export interface LayoutActor {
  id: string;
  center: LayoutPoint;
  size: LayoutSize;
}

export interface LayoutUseCase {
  id: string;
  center: LayoutPoint;
  size: LayoutSize;
}

export interface LayoutAssociation {
  id: string;
  points: LayoutPoint[];
}

export interface UseCaseLayout {
  diagramId: string;
  width: number;
  height: number;
  system: { x: number; y: number; width: number; height: number };
  actors: LayoutActor[];
  useCases: LayoutUseCase[];
  associations: LayoutAssociation[];
  fontSize: number;
}

export interface LayoutResult {
  ok: boolean;
  layout?: UseCaseLayout;
  diagnostics: Diagnostic[];
}

export interface GeneratorOptions extends LayoutOptions {
  systemName?: string;
  format?: "svg" | "json";
}

export interface UmlGenerationResult {
  ok: boolean;
  diagnostics: Diagnostic[];
  diagram?: UseCaseDiagram;
  layout?: UseCaseLayout;
  svg?: string;
  json?: string;
}

export type { Diagnostic, Evidence, HumanRequirementsModel, HrmAction, HrmConcept, SourceSpan };
