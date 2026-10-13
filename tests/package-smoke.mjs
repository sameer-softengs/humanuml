import {
  createCompiler,
  createVocabulary
} from "../packages/core/dist/index.mjs";

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

console.log("Core package smoke test passed.");
