# Architecture

HumanUML is intentionally a one-way deterministic pipeline:

`source → lexer → parser/AST → semantic analyzer → HRM builder → HRM validator`

`packages/contracts` defines stable data contracts. `language-core` owns tokens and CE-1 parsing. `vocabulary` normalizes registered actors, entities, verbs, aliases, plurals, and verb forms. `semantic-core` resolves references and creates evidence-bearing semantic records. `requirements-model` produces deterministic IDs, sorted arrays, and validates references, permissions, evidence, and inheritance cycles. `core` coordinates stages. The CLI is an I/O boundary and does not alter compiler semantics.

UML generation is deliberately outside this release.
