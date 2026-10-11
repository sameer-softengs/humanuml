
import {
  afterEach,
  describe,
  expect,
  it
} from "vitest";

import {
  mkdtemp,
  readFile,
  rm,
  writeFile
} from "node:fs/promises";

import { tmpdir } from "node:os";
import { join } from "node:path";

import {
  FileSafetyError,
  readLimitedFile,
  writeOutputSafely
} from "../../apps/cli/src/file-safety.js";

const directories: string[] = [];

async function fixture() {
  const directory = await mkdtemp(
    join(tmpdir(), "humanuml-security-")
  );

  directories.push(directory);

  const input = join(directory, "input.txt");
  const vocabulary = join(directory, "vocabulary.json");
  const output = join(directory, "model.json");

  await writeFile(input, "A student can borrow books.");
  await writeFile(vocabulary, "{}");

  return { input, vocabulary, output };
}

afterEach(async () => {
  for (const directory of directories.splice(0)) {
    await rm(directory, {
      recursive: true,
      force: true
    });
  }
});

describe("HumanUML CLI File Safety", () => {
  it("reads files within configured limits", async () => {
    const files = await fixture();

    const text = await readLimitedFile(
      files.input,
      1024
    );

    expect(text).toBe("A student can borrow books.");
  });

  it("rejects oversized files", async () => {
    const files = await fixture();

    await expect(
      readLimitedFile(files.input, 5)
    ).rejects.toThrow(FileSafetyError);
  });

  it("creates output when absent", async () => {
    const files = await fixture();

    await writeOutputSafely(
      files.output,
      '{"valid":true}',
      false,
      [files.input, files.vocabulary]
    );

    expect(
      await readFile(files.output, "utf8")
    ).toBe('{"valid":true}');
  });

  it("rejects overwriting without force", async () => {
    const files = await fixture();

    await writeFile(files.output, "original");

    await expect(
      writeOutputSafely(
        files.output,
        "replacement",
        false,
        [files.input, files.vocabulary]
      )
    ).rejects.toThrow("Output file already exists");

    expect(
      await readFile(files.output, "utf8")
    ).toBe("original");
  });

  it("allows explicit overwrite with force", async () => {
    const files = await fixture();

    await writeFile(files.output, "original");

    await writeOutputSafely(
      files.output,
      "replacement",
      true,
      [files.input, files.vocabulary]
    );

    expect(
      await readFile(files.output, "utf8")
    ).toBe("replacement");
  });

  it("protects the requirements file", async () => {
    const files = await fixture();

    await expect(
      writeOutputSafely(
        files.input,
        "danger",
        true,
        [files.input, files.vocabulary]
      )
    ).rejects.toThrow(
      "Output cannot overwrite an input or vocabulary file."
    );
  });

  it("protects the vocabulary file", async () => {
    const files = await fixture();

    await expect(
      writeOutputSafely(
        files.vocabulary,
        "danger",
        true,
        [files.input, files.vocabulary]
      )
    ).rejects.toThrow(
      "Output cannot overwrite an input or vocabulary file."
    );
  });
});
