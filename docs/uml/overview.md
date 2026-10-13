# UML generation overview

Phase 2 adds an offline Use Case Diagram pipeline:

`HRM → use-case DIR → semantic validation → deterministic layout → SVG`

The implementation is exposed by `@humanuml/uml-core` and has no DOM, browser, network, or filesystem dependency. The original `@humanuml/core` compiler remains unchanged.

```ts
import { createUmlGenerator } from "@humanuml/uml-core";
const result = createUmlGenerator().generateUseCase(hrm, {
  systemName: "Library Management System",
  format: "svg"
});
```
