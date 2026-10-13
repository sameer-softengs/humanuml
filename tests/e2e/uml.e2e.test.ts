import { afterEach, describe, expect, it, vi } from "vitest";
import { access, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { runCli } from "../../apps/cli/src/cli.js";

const directories: string[] = [];

async function fixture() {
  const directory = await mkdtemp(join(tmpdir(), "humanuml-uml-e2e-"));
  directories.push(directory);
  const input = join(directory, "requirements.txt");
  const vocabulary = join(directory, "vocabulary.json");
  await writeFile(input, "A student can borrow books.\nA librarian manages books.");
  await writeFile(vocabulary, JSON.stringify({
    actors: ["student", "librarian"],
    entities: ["book"],
    verbs: ["borrow", "manage"],
    plurals: { books: "book" },
    verbForms: { manages: "manage" }
  }));
  return { directory, input, vocabulary };
}

afterEach(async () => {
  vi.restoreAllMocks();
  for (const directory of directories.splice(0)) {
    await rm(directory, { recursive: true, force: true });
  }
});

describe("Use Case CLI generation", () => {
  it("generates deterministic SVG", async () => {
    const files = await fixture();
    const output = join(files.directory, "usecase.svg");
    const first = await runCli([
      "generate", "usecase", files.input,
      "--vocabulary", files.vocabulary,
      "--system", "Library Management System",
      "--output", output
    ]);
    const firstSvg = await readFile(output, "utf8");
    const second = await runCli([
      "generate", "usecase", files.input,
      "--vocabulary", files.vocabulary,
      "--system", "Library Management System",
      "--output", output, "--force"
    ]);
    const secondSvg = await readFile(output, "utf8");
    expect(first).toBe(0);
    expect(second).toBe(0);
    expect(firstSvg).toBe(secondSvg);
    expect(firstSvg).toContain("<svg");
  });

  it("generates DIR JSON and protects output overwrite", async () => {
    const files = await fixture();
    const output = join(files.directory, "usecase.json");
    expect(await runCli([
      "generate", "usecase", files.input,
      "--vocabulary", files.vocabulary,
      "--format", "json", "--output", output
    ])).toBe(0);
    const dir = JSON.parse(await readFile(output, "utf8")) as { kind: string; schemaVersion: string };
    expect(dir).toMatchObject({ kind: "use-case", schemaVersion: "0.2.0" });
    expect(await runCli([
      "generate", "usecase", files.input,
      "--vocabulary", files.vocabulary,
      "--format", "json", "--output", output
    ])).toBe(2);
  });

  it("rejects partial diagram generation and invalid requirements", async () => {
    const files = await fixture();
    const output = join(files.directory, "invalid.svg");
    await writeFile(files.input, "A dragon can borrow books.");
    expect(await runCli([
      "generate", "usecase", files.input,
      "--vocabulary", files.vocabulary,
      "--partial", "--output", output
    ])).toBe(2);
    expect(await runCli([
      "generate", "usecase", files.input,
      "--vocabulary", files.vocabulary,
      "--output", output
    ])).toBe(1);
    await expect(access(output)).rejects.toThrow();
  });
});
