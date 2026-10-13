# Architecture

HumanUML is intentionally a one-way deterministic pipeline:

`source → lexer → parser/AST → semantic analyzer → HRM builder → HRM validator`

`packages/contracts` defines stable data contracts. `language-core` owns tokens and CE-1 parsing. `vocabulary` normalizes registered actors, entities, verbs, aliases, plurals, and verb forms. `semantic-core` resolves references and creates evidence-bearing semantic records. `requirements-model` produces deterministic IDs, sorted arrays, and validates references, permissions, evidence, and inheritance cycles. `core` coordinates stages. The CLI is an I/O boundary and does not alter compiler semantics.

Phase 2 adds `packages/uml-core`, a focused headless package whose internal stages are typed DIR contracts, HRM mapping, DIR validation, layout, SVG rendering, and generator orchestration. UML generation is independent of the compiler package and does not alter the v0.1.0 HRM contract.
