import { describe, expect, it } from "vitest";

import { parseArgs } from "../../apps/cli/src/args.js";

describe("CLI arguments", () => {
  it("rejects conflicting strictness modes", () => {
    expect(() =>
      parseArgs([
        "compile",
        "requirements.txt",
        "--strict",
        "--partial"
      ])
    ).toThrow(/cannot be used together/);
  });

  it("rejects duplicate options", () => {
    expect(() =>
      parseArgs([
        "compile",
        "requirements.txt",
        "--output",
        "a.json",
        "--output",
        "b.json"
      ])
    ).toThrow(/Duplicate option/);
  });

  it("parses use case generation options", () => {
    expect(parseArgs([
      "generate", "usecase", "requirements.txt",
      "--format", "json", "--system", "Library", "--force"
    ])).toEqual({
      kind: "generate-usecase",
      options: {
        input: "requirements.txt",
        output: "usecase.svg",
        vocabulary: "examples/library-vocabulary.json",
        strict: true,
        force: true,
        format: "json",
        systemName: "Library"
      }
    });
  });

  it("rejects partial generation", () => {
    expect(() => parseArgs([
      "generate", "usecase", "requirements.txt", "--partial"
    ])).toThrow(/not supported/);
  });
});
