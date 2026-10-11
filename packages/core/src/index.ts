/**
 * HumanUML Core SDK
 * Public API v0.1.0
 */

export {
  createCompiler
} from "./compiler.js";

export type {
  Compiler,
  CompileResult
} from "./compiler.js";

export type {
  CompileOptions
} from "./options.js";

// Vocabulary API
export {
  createVocabulary
} from "../../vocabulary/src/index.js";

export type {
  VocabularyConfig,
  VocabularyKind,
  VocabularyMatch,
  VocabularyRegistry
} from "../../vocabulary/src/index.js";

// Public model and diagnostic contracts
export type {
  HumanRequirementsModel,
  HrmConcept,
  HrmAction,
  HrmRelation,
  Evidence
} from "../../contracts/src/hrm.js";

export type {
  Diagnostic,
  DiagnosticSeverity
} from "../../contracts/src/diagnostics.js";
