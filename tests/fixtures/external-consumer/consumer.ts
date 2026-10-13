import {
  createCompiler,
  createVocabulary
} from "@humanuml/core";

const vocabulary = createVocabulary({
  actors: ["student"],
  entities: ["book"],
  verbs: ["borrow"]
});

const result = createCompiler().compile(
  "A student can borrow a book.",
  { vocabulary, grammarVersion: "CE-1", strict: true }
);

if (!result.ok || !result.model || result.model.actions.length !== 1) {
  throw new Error("Unexpected HumanUML compilation result.");
}

console.log(result.model.actions[0]?.verb);
