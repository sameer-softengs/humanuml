
import type { SourceSpan } from "./source.js";

export type DiagnosticSeverity =
  | "error"
  | "warning"
  | "info";

export interface Diagnostic {
  code: string;
  severity: DiagnosticSeverity;
  message: string;
  span?: SourceSpan;
  suggestions?: string[];
}

export interface DiagnosticResult {
  diagnostics: Diagnostic[];
  hasErrors: boolean;
}
