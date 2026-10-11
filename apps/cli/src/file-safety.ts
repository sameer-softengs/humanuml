
import {
  lstat,
  open,
  realpath,
  rename,
  rm
} from "node:fs/promises";

import {
  basename,
  dirname,
  join,
  resolve
} from "node:path";

import { randomUUID } from "node:crypto";

export const MAX_REQUIREMENTS_BYTES =
  5 * 1024 * 1024;

export const MAX_VOCABULARY_BYTES =
  1024 * 1024;

export class FileSafetyError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "FileSafetyError";
  }
}

function hasCode(
  error: unknown,
  code: string
): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    error.code === code
  );
}

async function canonicalPath(
  path: string
): Promise<string> {
  return realpath(resolve(path));
}

export async function readLimitedFile(
  path: string,
  maxBytes: number
): Promise<string> {
  const filePath = resolve(path);
  const info = await lstat(filePath);

  if (!info.isFile()) {
    throw new FileSafetyError(
      `Expected a regular file: ${filePath}`
    );
  }

  if (info.size > maxBytes) {
    throw new FileSafetyError(
      `File exceeds maximum size of ${maxBytes} bytes: ${filePath}`
    );
  }

  const handle = await open(filePath, "r");

  try {
    const data = await handle.readFile();

    if (data.byteLength > maxBytes) {
      throw new FileSafetyError(
        `File exceeds maximum size of ${maxBytes} bytes: ${filePath}`
      );
    }

    return new TextDecoder(
      "utf-8",
      { fatal: true }
    ).decode(data);
  } finally {
    await handle.close();
  }
}

export async function assertSafeOutput(
  output: string,
  protectedFiles: string[]
): Promise<void> {
  const outputPath = resolve(output);

  const parent = await realpath(
    dirname(outputPath)
  );

  const canonicalOutput = join(
    parent,
    basename(outputPath)
  );

  for (const protectedFile of protectedFiles) {
    const canonicalProtected =
      await canonicalPath(protectedFile);

    if (
      process.platform === "win32"
        ? canonicalOutput.toLowerCase() ===
          canonicalProtected.toLowerCase()
        : canonicalOutput === canonicalProtected
    ) {
      throw new FileSafetyError(
        "Output cannot overwrite an input or vocabulary file."
      );
    }
  }

  try {
    const info = await lstat(outputPath);

    if (info.isSymbolicLink()) {
      throw new FileSafetyError(
        "Output cannot be a symbolic link."
      );
    }

    if (!info.isFile()) {
      throw new FileSafetyError(
        "Output must be a regular file."
      );
    }
  } catch (error) {
    if (!hasCode(error, "ENOENT")) {
      throw error;
    }
  }
}

export async function writeOutputSafely(
  output: string,
  content: string,
  force: boolean,
  protectedFiles: string[]
): Promise<void> {
  const outputPath = resolve(output);

  await assertSafeOutput(
    outputPath,
    protectedFiles
  );

  if (!force) {
    let handle;

    try {
      handle = await open(
        outputPath,
        "wx",
        0o600
      );

      await handle.writeFile(
        content,
        "utf8"
      );

      await handle.sync();

      return;
    } catch (error) {
      if (hasCode(error, "EEXIST")) {
        throw new FileSafetyError(
          `Output file already exists: ${outputPath}. ` +
          "Use --force to overwrite it."
        );
      }

      throw error;
    } finally {
      await handle?.close();
    }
  }

  const temporaryPath = join(
    dirname(outputPath),
    `.${basename(outputPath)}.${randomUUID()}.tmp`
  );

  try {
    const handle = await open(
      temporaryPath,
      "wx",
      0o600
    );

    try {
      await handle.writeFile(
        content,
        "utf8"
      );

      await handle.sync();
    } finally {
      await handle.close();
    }

    await assertSafeOutput(
      outputPath,
      protectedFiles
    );

    await rename(
      temporaryPath,
      outputPath
    );
  } finally {
    await rm(temporaryPath, {
      force: true
    });
  }
}
