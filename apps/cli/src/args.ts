
export interface CliOptions {
  input: string;
  output: string;
  vocabulary: string;
  strict: boolean;
  force: boolean;
}

export interface GenerateUseCaseOptions {
  input: string;
  output: string;
  vocabulary: string;
  strict: boolean;
  force: boolean;
  format: "svg" | "json";
  systemName?: string;
}

export type CliArgs =
  | { kind: "help" }
  | { kind: "compile"; options: CliOptions }
  | { kind: "generate-usecase"; options: GenerateUseCaseOptions };

export function parseArgs(args: string[]): CliArgs {
  if (
    args.length === 0 ||
    args.includes("--help") ||
    args.includes("-h")
  ) {
    return { kind: "help" };
  }

  if (args[0] !== "compile" && args[0] !== "generate") {
    throw new Error(
      `Unknown command: ${args[0]}`
    );
  }

  const generateUseCase = args[0] === "generate";
  if (generateUseCase && args[1] !== "usecase") {
    throw new Error(
      `Unknown diagram type: ${args[1] ?? ""}`
    );
  }

  const input = args[generateUseCase ? 2 : 1];

  if (!input || input.startsWith("-")) {
    throw new Error(
      "Missing requirements file."
    );
  }

  const options: CliOptions = {
    input,
    output: generateUseCase ? "usecase.svg" : "model.json",
    vocabulary: "examples/library-vocabulary.json",
    strict: true,
    force: false,
    ...(generateUseCase ? { format: "svg" as const } : {})
  };

  const seen = new Set<string>();

  for (let i = generateUseCase ? 3 : 2; i < args.length; i++) {
    const arg = args[i]!;

    if (seen.has(arg)) {
      throw new Error(`Duplicate option: ${arg}`);
    }

    seen.add(arg);

    if (arg === "--strict") {
      if (!options.strict && seen.has("--partial")) {
        throw new Error(
          "Options --strict and --partial cannot be used together."
        );
      }

      options.strict = true;
      continue;
    }

    if (arg === "--partial") {
      if (options.strict && seen.has("--strict")) {
        throw new Error(
          "Options --strict and --partial cannot be used together."
        );
      }

      options.strict = false;
      continue;
    }
    if (arg === "--force") {
      options.force = true;
      continue;
    }
    if (arg === "--output" || arg === "--vocabulary") {
      const value = args[++i];

      if (!value || value.startsWith("--")) {
        throw new Error(
          `Missing value for ${arg}.`
        );
      }

      if (arg === "--output") {
        options.output = value;
      } else {
        options.vocabulary = value;
      }

      continue;
    }

    if (generateUseCase && arg === "--format") {
      const value = args[++i];
      if (value !== "svg" && value !== "json") {
        throw new Error("--format must be svg or json.");
      }
      (options as GenerateUseCaseOptions).format = value;
      continue;
    }

    if (generateUseCase && arg === "--system") {
      const value = args[++i];
      if (!value || value.startsWith("--")) {
        throw new Error("Missing value for --system.");
      }
      (options as GenerateUseCaseOptions).systemName = value;
      continue;
    }

    throw new Error(`Unknown option: ${arg}`);
  }

  if (generateUseCase && !options.strict) {
    throw new Error(
      "--partial is not supported for diagram generation."
    );
  }

  return generateUseCase
    ? { kind: "generate-usecase", options: options as GenerateUseCaseOptions }
    : { kind: "compile", options: options as CliOptions };
}
