# HumanUML

HumanUML is a deterministic, local-first compiler for a small Controlled English grammar. It transforms requirements into a validated Human Requirements Model (HRM), preserving source evidence for every generated record.

Version 0.1.0 covers the Controlled English → lexer → parser → semantic analysis → HRM pipeline. Full UML diagram generation is future work and is not part of the verified release feature set.

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
