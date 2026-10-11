
import { readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";

import { createCompiler } from
  "../../../packages/core/src/index.js";

import { createVocabulary } from
  "../../../packages/vocabulary/src/index.js";

import type { VocabularyConfig } from
  "../../../packages/vocabulary/src/types.js";

import { parseArgs } from "./args.js";

const HELP = `
HumanUML CLI v0.1.0

Usage:
  humanuml compile <file> [options]

Options:
  --output <file>       Output JSON path
  --vocabulary <file>   Vocabulary JSON path
  --strict              Reject incomplete models (default)
  --partial             Export valid partial results
  --help, -h            Show this help

Examples:
  humanuml compile examples/library-system.txt
  humanuml compile requirements.txt --output model.json
`;

function isVocabularyConfig(
  value: unknown
): value is VocabularyConfig {
  if (
    typeof value !== "object" ||
    value === null
  ) {
    return false;
  }

  const record = value as Record<string, unknown>;

  return ["actors", "entities", "verbs"].every(key =>
    Array.isArray(record[key]) &&
    (record[key] as unknown[]).every(
      item => typeof item === "string"
    )
  ) && ["aliases", "plurals", "verbForms"].every(
    key =>
      record[key] === undefined ||
      (
        typeof record[key] === "object" &&
        record[key] !== null &&
        !Array.isArray(record[key]) &&
        Object.values(record[key]).every(
          item => typeof item === "string"
        )
      )
  );
}

export async function runCli(
  args: string[]
): Promise<number> {
  try {
    const command = parseArgs(args);

    if (command.kind === "help") {
      console.log(HELP);
      return 0;
    }

    const options = command.options;

    const inputPath = resolve(options.input);
    const outputPath = resolve(options.output);
    const vocabularyPath = resolve(options.vocabulary);

    if (
      outputPath === inputPath ||
      outputPath === vocabularyPath
    ) {
      throw new Error(
        "Output path must differ from input and vocabulary files."
      );
    }

    const [source, vocabularyText] = await Promise.all([
      readFile(inputPath, "utf8"),
      readFile(vocabularyPath, "utf8")
    ]);

    const rawVocabulary: unknown =
      JSON.parse(vocabularyText);

    if (!isVocabularyConfig(rawVocabulary)) {
      throw new Error(
        "Invalid vocabulary configuration."
      );
    }

    const vocabulary = createVocabulary(rawVocabulary);
    const compiler = createCompiler();

    const result = compiler.compile(source, {
      vocabulary,
      strict: options.strict,
      grammarVersion: "CE-1"
    });

    for (const diagnostic of result.diagnostics) {
      const location = diagnostic.span
        ? ` [${diagnostic.span.start}:${diagnostic.span.end}]`
        : "";

      console.error(
        `${diagnostic.severity.toUpperCase()} ` +
        `${diagnostic.code}${location}: ` +
        diagnostic.message
      );
    }

    if (result.model) {
      const json = JSON.stringify(
        result.model,
        null,
        2
      );

      await writeFile(
        outputPath,
        json + "\n",
        "utf8"
      );

      console.log(
        `HumanUML model saved: ${outputPath}`
      );
    }

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
    console.error(
      "HumanUML CLI error:",
      error instanceof Error
        ? error.message
        : String(error)
    );

    return 2;
  }
}
