
import {
  describe,
  expect,
  it,
  afterEach,
  vi
} from "vitest";

import {
  mkdtemp,
  readFile,
  writeFile,
  rm,
  access
} from "node:fs/promises";

import { tmpdir } from "node:os";
import { join } from "node:path";

import {
  runCli
} from "../../apps/cli/src/cli.js";

import type {
  HumanRequirementsModel
} from "../../packages/contracts/src/hrm.js";

const directories: string[] = [];

async function createFixture(
  text: string,
  vocabulary: unknown = {
    actors: ["student", "librarian", "guest"],
    entities: ["book", "category"],
    verbs: ["borrow", "manage", "register"],
    plurals: {
      books: "book"
    },
    verbForms: {
      manages: "manage"
    }
  }
) {
  const directory = await mkdtemp(
    join(tmpdir(), "humanuml-e2e-")
  );

  directories.push(directory);

  const input = join(directory, "requirements.txt");
  const output = join(directory, "model.json");
  const vocabularyPath = join(
    directory,
    "vocabulary.json"
  );

  await writeFile(input, text, "utf8");

  await writeFile(
    vocabularyPath,
    JSON.stringify(vocabulary),
    "utf8"
  );

  return {
    directory,
    input,
    output,
    vocabularyPath
  };
}

type Fixture = Awaited<ReturnType<typeof createFixture>>;

async function execute(
  fixture: Fixture,
  partial = false,
  force = false
) {
  const logs: string[] = [];
  const errors: string[] = [];

  const logSpy = vi
    .spyOn(console, "log")
    .mockImplementation((...args) => {
      logs.push(args.map(String).join(" "));
    });

  const errorSpy = vi
    .spyOn(console, "error")
    .mockImplementation((...args) => {
      errors.push(args.map(String).join(" "));
    });

  try {
    const code = await runCli([
      "compile",
      fixture.input,
      "--output",
      fixture.output,
      "--vocabulary",
      fixture.vocabularyPath,
      ...(partial ? ["--partial"] : []),
      ...(force ? ["--force"] : [])
    ]);

    return { code, logs, errors };
  } finally {
    logSpy.mockRestore();
    errorSpy.mockRestore();
  }
}

async function readModel(
  output: string
): Promise<HumanRequirementsModel> {
  return JSON.parse(
    await readFile(output, "utf8")
  ) as HumanRequirementsModel;
}

async function exists(path: string): Promise<boolean> {
  try {
    await access(path);
    return true;
  } catch {
    return false;
  }
}

afterEach(async () => {
  for (const directory of directories.splice(0)) {
    await rm(directory, {
      recursive: true,
      force: true
    });
  }

  vi.restoreAllMocks();
});

describe("HumanUML P1-07C E2E", () => {
  it("compiles a complete library system", async () => {
    const fixture = await createFixture(
      "A student can borrow books. " +
      "A librarian manages books. " +
      "A book belongs to a category. " +
      "A student must register."
    );

    const result = await execute(fixture);

    expect(result.code).toBe(0);

    const model = await readModel(fixture.output);

    expect(model.concepts).toHaveLength(4);
    expect(model.actions).toHaveLength(3);
    expect(model.relations).toHaveLength(1);
    expect(model.grammarVersion).toBe("CE-1");
  });

  it("compiles an e-commerce domain", async () => {
    const fixture = await createFixture(
      "A customer can place orders. " +
      "An administrator may approve orders. " +
      "An administrator manages products. " +
      "An order contains products. " +
      "A guest cannot approve orders. " +
      "A customer must register.",
      {
        actors: [
          "customer",
          "administrator",
          "guest"
        ],
        entities: ["order", "product"],
        verbs: [
          "place",
          "approve",
          "manage",
          "register"
        ],
        plurals: {
          orders: "order",
          products: "product"
        },
        verbForms: {
          manages: "manage"
        }
      }
    );

    const result = await execute(fixture);

    expect(result.code).toBe(0);

    const model = await readModel(fixture.output);

    expect(model.concepts).toHaveLength(5);
    expect(model.actions).toHaveLength(5);
    expect(model.relations).toHaveLength(1);
  });

  it("rejects unknown actors in strict mode", async () => {
    const fixture = await createFixture(
      "A dragon can borrow books."
    );

    const result = await execute(fixture);

    expect(result.code).toBe(1);
    expect(await exists(fixture.output)).toBe(false);

    expect(
      result.errors.some(line =>
        line.includes("HU-LEX-001")
      )
    ).toBe(true);
  });

  it("rejects conflicting permissions", async () => {
    const fixture = await createFixture(
      "A student can borrow books. " +
      "A student cannot borrow books."
    );

    const result = await execute(fixture);

    expect(result.code).toBe(1);
    expect(await exists(fixture.output)).toBe(false);

    expect(
      result.errors.some(line =>
        line.includes("HU-SEM-003")
      )
    ).toBe(true);
  });

  it("exports valid partial results", async () => {
    const fixture = await createFixture(
      "A student can borrow books. " +
      "A dragon can borrow books."
    );

    const result = await execute(fixture, true);

    expect(result.code).toBe(1);
    expect(await exists(fixture.output)).toBe(true);

    const model = await readModel(fixture.output);

    expect(model.actions).toHaveLength(1);
  });

  it("merges duplicate requirements", async () => {
    const fixture = await createFixture(
      "A student can borrow books. " +
      "A student can borrow books."
    );

    const result = await execute(fixture);

    expect(result.code).toBe(0);

    const model = await readModel(fixture.output);

    expect(model.actions).toHaveLength(1);
    expect(model.actions[0]?.evidence).toHaveLength(2);
  });

  it("returns an error for invalid vocabulary", async () => {
    const fixture = await createFixture(
      "A student can borrow books.",
      { actors: "student" }
    );

    const result = await execute(fixture);

    expect(result.code).toBe(2);
    expect(await exists(fixture.output)).toBe(false);
  });

  it("generates deterministic JSON", async () => {
    const fixture = await createFixture(
      "A student can borrow books."
    );

    // First compilation: output does not exist.
    const first = await execute(fixture);

    expect(first.code).toBe(0);

    const firstJson = await readFile(
      fixture.output,
      "utf8"
    );

    // Second compilation: explicitly allow overwriting.
    const second = await execute(
      fixture,
      false,
      true
    );

    expect(second.code).toBe(0);

    const secondJson = await readFile(
      fixture.output,
      "utf8"
    );

    // The generated content must remain identical.
    expect(secondJson).toBe(firstJson);
  });

  it("prevents overwriting without --force", async () => {
    const fixture = await createFixture(
      "A student can borrow books."
    );

    const first = await execute(fixture);

    expect(first.code).toBe(0);

    const originalJson = await readFile(
      fixture.output,
      "utf8"
    );

    // Attempt to overwrite without permission.
    const second = await execute(fixture);

    expect(second.code).toBe(2);

    expect(
      second.errors.some(line =>
        line.includes("Output file already exists")
      )
    ).toBe(true);

    // Existing data must remain unchanged.
    const finalJson = await readFile(
      fixture.output,
      "utf8"
    );

    expect(finalJson).toBe(originalJson);
  });
});
