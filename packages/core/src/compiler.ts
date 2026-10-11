
import type {
  HumanRequirementsModel
} from "../../contracts/src/hrm.js";

import type {
  Diagnostic
} from "../../contracts/src/diagnostics.js";

import {
  tokenize,
  parse
} from "../../language-core/src/index.js";

import {
  analyze
} from "../../semantic-core/src/index.js";

import {
  buildModel,
  validateModel
} from "../../requirements-model/src/index.js";

import type {
  CompileOptions
} from "./options.js";

export interface CompileResult {
  ok: boolean;
  model?: HumanRequirementsModel;
  diagnostics: Diagnostic[];
}

export interface Compiler {
  compile(
    source: string,
    options: CompileOptions
  ): CompileResult;
}

// Default limit: 64 Ki UTF-16 code units.
const DEFAULT_MAX_SOURCE_LENGTH = 65_536;

// Maximum configurable source limit.
const MAX_ALLOWED_SOURCE_LENGTH = 1_000_000;

export function createCompiler(): Compiler {
  return {
    compile(source, options) {
      const diagnostics: Diagnostic[] = [];

      const strict = options.strict ?? true;

      // Stage 0 — Validate compiler configuration
      const maxSourceLength =
        options.maxSourceLength ??
        DEFAULT_MAX_SOURCE_LENGTH;

      if (
        !Number.isSafeInteger(maxSourceLength) ||
        maxSourceLength < 1 ||
        maxSourceLength > MAX_ALLOWED_SOURCE_LENGTH
      ) {
        throw new RangeError(
          "maxSourceLength must be an integer " +
          "between 1 and 1,000,000."
        );
      }

      // Stage 0.1 — Validate empty input
      if (source.trim().length === 0) {
        return {
          ok: false,
          diagnostics: [
            {
              code: "HU-INPUT-001",
              severity: "error",
              message:
                "Requirements document is empty."
            }
          ]
        };
      }

      // Stage 0.2 — Validate source length
      if (source.length > maxSourceLength) {
        return {
          ok: false,
          diagnostics: [
            {
              code: "HU-INPUT-002",
              severity: "error",
              message:
                "Requirements document exceeds " +
                `${maxSourceLength.toLocaleString("en-US")} ` +
                "UTF-16 code units."
            }
          ]
        };
      }

      // Stage 0.3 — Validate grammar version
      if (
        options.grammarVersion !== undefined &&
        options.grammarVersion !== "CE-1"
      ) {
        return {
          ok: false,
          diagnostics: [
            {
              code: "HU-INPUT-003",
              severity: "error",
              message:
                "Unsupported grammar version."
            }
          ]
        };
      }

      // Stage 1 — Lexical analysis
      const lexical = tokenize(
        source,
        options.vocabulary
      );

      for (const token of lexical.unknown) {
        diagnostics.push({
          code: "HU-LEX-001",
          severity: "error",
          message:
            `Unrecognized token: "${token.raw}".`,
          span: token.span
        });
      }

      // Stage 2 — Grammar parsing
      const parsed = parse(
        lexical.tokens,
        source
      );

      diagnostics.push(...parsed.diagnostics);

      // Stage 3 — Semantic analysis
      const semantic = analyze(
        parsed.ast,
        source,
        options.vocabulary
      );

      diagnostics.push(...semantic.diagnostics);

      // Stage 4 — HRM construction
      const model = buildModel(semantic);

      // Stage 5 — Model validation
      diagnostics.push(
        ...validateModel(model, { source })
      );

      // Stage 6 — Determine compilation status
      const ok = !diagnostics.some(
        diagnostic =>
          diagnostic.severity === "error"
      );

      return {
        ok,
        ...(ok || !strict ? { model } : {}),
        diagnostics
      };
    }
  };
}
