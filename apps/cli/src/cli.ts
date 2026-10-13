
import { resolve } from "node:path";

import {
  readLimitedFile,
  writeOutputSafely,
  MAX_REQUIREMENTS_BYTES,
  MAX_VOCABULARY_BYTES
} from "./file-safety.js";

import {
  createCompiler
} from "../../../packages/core/src/index.js";

import {
  createVocabulary
} from "../../../packages/vocabulary/src/index.js";

import {
  createUmlGenerator
} from "../../../packages/uml-core/src/index.js";

import type {
  VocabularyConfig
} from "../../../packages/vocabulary/src/types.js";

import { parseArgs, type GenerateUseCaseOptions } from "./args.js";

const HELP = `
HumanUML CLI v0.2.0

Usage:
  humanuml compile <file> [options]

Options:
  --output <file>       Output JSON path
  --vocabulary <file>   Vocabulary JSON path
  --strict              Reject incomplete models (default)
  --partial             Export valid partial results
  --force               Allow overwriting existing output
  --help, -h            Show this help

File limits:
  Requirements           5 MB maximum
  Vocabulary             1 MB maximum

Examples:
  humanuml compile examples/library-system.txt
  humanuml compile requirements.txt --output model.json
  humanuml compile requirements.txt --output model.json --force
  humanuml compile requirements.txt --partial

  humanuml generate usecase requirements.txt --output usecase.svg \\
    --vocabulary vocabulary.json --system "Library Management System"
  humanuml generate usecase requirements.txt --format json --output usecase.json
`;

function isVocabularyConfig(
  value: unknown
): value is VocabularyConfig {
  if (
    typeof value !== "object" ||
    value === null ||
    Array.isArray(value)
  ) {
    return false;
  }

  const record = value as Record<string, unknown>;

  const requiredFields = [
    "actors",
    "entities",
    "verbs"
  ];

  const validRequiredFields = requiredFields.every(
    key =>
      Array.isArray(record[key]) &&
      (record[key] as unknown[]).every(
        item => typeof item === "string"
      )
  );

  if (!validRequiredFields) {
    return false;
  }

  const optionalFields = [
    "aliases",
    "plurals",
    "verbForms"
  ];

  return optionalFields.every(key => {
    const field = record[key];

    if (field === undefined) {
      return true;
    }

    if (
      typeof field !== "object" ||
      field === null ||
      Array.isArray(field)
    ) {
      return false;
    }

    return Object.values(field).every(
      item => typeof item === "string"
    );
  });
}

export async function runCli(
  args: string[]
): Promise<number> {
  try {
    // ----------------------------------------
    // 1. Parse command-line arguments
    // ----------------------------------------

    const command = parseArgs(args);

    if (command.kind === "help") {
      console.log(HELP);
      return 0;
    }

    const options = command.options;
    const isDiagram = command.kind === "generate-usecase";

    // ----------------------------------------
    // 2. Resolve file paths
    // ----------------------------------------

    const inputPath = resolve(options.input);
    const outputPath = resolve(options.output);
    const vocabularyPath = resolve(
      options.vocabulary
    );

    // ----------------------------------------
    // 3. Read files with size limits
    // ----------------------------------------

    const [
      source,
      vocabularyText
    ] = await Promise.all([
      readLimitedFile(
        inputPath,
        MAX_REQUIREMENTS_BYTES
      ),
      readLimitedFile(
        vocabularyPath,
        MAX_VOCABULARY_BYTES
      )
    ]);

    // ----------------------------------------
    // 4. Parse and validate vocabulary
    // ----------------------------------------

    let rawVocabulary: unknown;

    try {
      rawVocabulary = JSON.parse(
        vocabularyText
      ) as unknown;
    } catch {
      throw new Error(
        "Vocabulary file contains invalid JSON."
      );
    }

    if (!isVocabularyConfig(rawVocabulary)) {
      throw new Error(
        "Invalid vocabulary configuration. " +
        "Expected arrays for actors, entities, and verbs."
      );
    }

    const vocabulary = createVocabulary(
      rawVocabulary
    );

    // ----------------------------------------
    // 5. Compile requirements
    // ----------------------------------------

    const compiler = createCompiler();

    const result = compiler.compile(
      source,
      {
        vocabulary,
        strict: options.strict,
        grammarVersion: "CE-1"
      }
    );

    // ----------------------------------------
    // 6. Print compiler diagnostics
    // ----------------------------------------

    for (const diagnostic of result.diagnostics) {
      const location = diagnostic.span
        ? ` [${diagnostic.span.start}:${diagnostic.span.end}]`
        : "";

      const message =
        `${diagnostic.severity.toUpperCase()} ` +
        `${diagnostic.code}${location}: ` +
        diagnostic.message;

      console.error(message);
    }

    if (isDiagram) {
      const diagramOptions = options as GenerateUseCaseOptions;
      if (!result.ok || !result.model) {
        console.error("Diagram generation stopped because requirements did not compile successfully.");
        return 1;
      }

      const generated = createUmlGenerator().generateUseCase(
        result.model,
        {
          format: diagramOptions.format,
          ...(diagramOptions.systemName ? { systemName: diagramOptions.systemName } : {})
        }
      );

      for (const diagnostic of generated.diagnostics) {
        const location = diagnostic.span
          ? ` [${diagnostic.span.start}:${diagnostic.span.end}]`
          : "";
        console.error(
          `${diagnostic.severity.toUpperCase()} ${diagnostic.code}${location}: ${diagnostic.message}`
        );
      }

      if (!generated.ok) {
        console.error("Diagram generation completed with errors.");
        return 1;
      }

      const content = diagramOptions.format === "json"
        ? generated.json
        : generated.svg;
      if (content === undefined) {
        console.error("Diagram generation produced no output.");
        return 2;
      }

      await writeOutputSafely(
        outputPath,
        content,
        options.force,
        [inputPath, vocabularyPath]
      );
      console.log(`HumanUML diagram saved: ${outputPath}`);
      return 0;
    }

    // ----------------------------------------
    // 7. Safely export the generated HRM
    // ----------------------------------------

    if (result.model) {
      const json = JSON.stringify(
        result.model,
        null,
        2
      );

      await writeOutputSafely(
        outputPath,
        json + "\n",
        options.force,
        [
          inputPath,
          vocabularyPath
        ]
      );

      console.log(
        `HumanUML model saved: ${outputPath}`
      );
    }

    // ----------------------------------------
    // 8. Return compilation status
    // ----------------------------------------

    if (!result.ok) {
      console.error(
        "Compilation completed with errors."
      );

      return 1;
    }

    console.log(
      "Compilation completed successfully."
    );

    return 0;
  } catch (error: unknown) {
    // ----------------------------------------
    // 9. Handle CLI and filesystem errors
    // ----------------------------------------

    const message =
      error instanceof Error
        ? error.message
        : String(error);

    console.error(
      "HumanUML CLI error:",
      message
    );

    return 2;
  }
}
