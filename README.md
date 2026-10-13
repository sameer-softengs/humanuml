# HumanUML

HumanUML is a deterministic, local-first compiler for a small Controlled English grammar. It transforms requirements into a validated Human Requirements Model (HRM), preserving source evidence for every generated record.

Version 0.1.0 provides the Controlled English → lexer → parser → semantic analysis → HRM pipeline. Version 0.2.0 adds deterministic Use Case Diagram generation; other UML diagram types remain future work.

## Quick start

```powershell
pnpm install --frozen-lockfile
pnpm typecheck
pnpm test
pnpm build
node apps/cli/dist/index.mjs compile examples/library-system.txt --vocabulary examples/library-vocabulary.json --output model.json
```

The CLI returns exit code `0` for success, `1` for requirements errors, and `2` for configuration or filesystem errors. Existing output is protected unless `--force` is supplied.

## Programmatic API

```ts
import { createCompiler, createVocabulary } from "@humanuml/core";

const vocabulary = createVocabulary({
  actors: ["student"], entities: ["book"], verbs: ["borrow"]
});
const result = createCompiler().compile(
  "A student can borrow a book.",
  { vocabulary, strict: true, grammarVersion: "CE-1" }
);
```

See [docs/development.md](docs/development.md) for validation, packaging, and contribution commands.

## Use Case diagrams (v0.2.0)

```powershell
node apps/cli/dist/index.mjs generate usecase examples/library-system.txt `
  --vocabulary examples/library-vocabulary.json `
  --system "Library Management System" `
  --output usecase.svg
```

Use Case generation is deterministic and traceable to HRM evidence. Only Use Case Diagrams are implemented; see [docs/uml/limitations.md](docs/uml/limitations.md).
