
export interface CliOptions {
  input: string;
  output: string;
  vocabulary: string;
  strict: boolean;
  force: boolean;
}

export type CliArgs =
  | { kind: "help" }
  | { kind: "compile"; options: CliOptions };

export function parseArgs(args: string[]): CliArgs {
  if (
    args.length === 0 ||
    args.includes("--help") ||
    args.includes("-h")
  ) {
    return { kind: "help" };
  }

  if (args[0] !== "compile") {
    throw new Error(
      `Unknown command: ${args[0]}`
    );
  }

  const input = args[1];

  if (!input || input.startsWith("-")) {
    throw new Error(
      "Missing requirements file."
    );
  }

  const options: CliOptions = {
    input,
    output: "model.json",
    vocabulary: "examples/library-vocabulary.json",
    strict: true,
    force: false
  };

  const seen = new Set<string>();

  for (let i = 2; i < args.length; i++) {
    const arg = args[i]!;

    if (seen.has(arg)) {
      throw new Error(`Duplicate option: ${arg}`);
    }

    seen.add(arg);

    if (arg === "--strict") {
      options.strict = true;
      continue;
    }

    if (arg === "--partial") {
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

    throw new Error(`Unknown option: ${arg}`);
  }

  return { kind: "compile", options };
}
