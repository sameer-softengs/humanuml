import {
  createCompiler,
  createVocabulary
} from "../packages/core/dist/index.mjs";

import { createUmlGenerator } from "../packages/uml-core/dist/index.mjs";

const vocabulary = createVocabulary({
  actors: ["student"],
  entities: ["book"],
  verbs: ["borrow"]
});

const result = createCompiler().compile(
  "A student can borrow a book.",
  { vocabulary, grammarVersion: "CE-1" }
);

if (!result.ok || !result.model || result.model.actions.length !== 1) {
  throw new Error("Core package smoke compilation failed.");
}

const diagram = createUmlGenerator().generateUseCase(result.model, {
  systemName: "Library",
  format: "svg"
});

if (!diagram.ok || !diagram.svg?.startsWith("<svg")) {
  throw new Error("UML package smoke generation failed.");
}

console.log("Core and UML package smoke tests passed.");
