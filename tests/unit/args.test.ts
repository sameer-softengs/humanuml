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
});
