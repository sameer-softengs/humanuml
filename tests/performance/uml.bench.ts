import { performance } from "node:perf_hooks";
import { createCompiler, createVocabulary } from "../../packages/core/src/index.js";
import {
  layoutUseCaseDiagram,
  mapUseCaseDiagram,
  renderUseCaseSvg,
  validateUseCaseDiagram
} from "../../packages/uml-core/src/index.js";

const WARMUPS = 2;
const RUNS = 5;

function median(values: number[]): number {
  const sorted = [...values].sort((a, b) => a - b);
  return sorted[Math.floor(sorted.length / 2)]!;
}

function round(value: number): number {
  return Number(value.toFixed(2));
}

type Samples = {
  mapping: number[];
  validation: number[];
  layout: number[];
  rendering: number[];
  total: number[];
};

function fixture(actorCount: number, useCaseCount: number) {
  const actors = Array.from({ length: actorCount }, (_, index) => `actor${index}`);
  const entities = Array.from({ length: useCaseCount }, (_, index) => `entity${index}`);
  const verbs = Array.from({ length: useCaseCount }, (_, index) => `verb${index}`);
  const vocabulary = createVocabulary({ actors, entities, verbs });
  const sentences = actors.flatMap(actor =>
    verbs.map((verb, index) => `A ${actor} can ${verb} entity${index}.`)
  );
  const compiled = createCompiler().compile(sentences.join("\n"), {
    vocabulary,
    grammarVersion: "CE-1",
    maxSourceLength: 1_000_000
  });
  if (!compiled.ok || !compiled.model) {
    throw new Error(JSON.stringify(compiled.diagnostics));
  }
  return compiled.model;
}

function run(actorCount: number, useCaseCount: number) {
  const hrm = fixture(actorCount, useCaseCount);
  const samples: Samples = {
    mapping: [], validation: [], layout: [], rendering: [], total: []
  };
  let svgBytes = 0;
  for (let warmup = 0; warmup < WARMUPS; warmup++) measure(hrm, samples, false);
  for (let run = 0; run < RUNS; run++) {
    const result = measure(hrm, samples, true);
    svgBytes = result.svgBytes;
  }
  return {
    actors: actorCount,
    useCases: useCaseCount,
    associations: hrm.actions.length,
    mappingMs: round(median(samples.mapping)),
    validationMs: round(median(samples.validation)),
    layoutMs: round(median(samples.layout)),
    renderingMs: round(median(samples.rendering)),
    totalMs: round(median(samples.total)),
    svgBytes,
    deterministic: measure(hrm, samples, false).svgBytes === svgBytes
  };
}

function measure(hrm: ReturnType<typeof fixture>, samples: Samples, collect: boolean) {
  const totalStart = performance.now();
  const mappingStart = performance.now();
  const mapped = mapUseCaseDiagram(hrm, { systemName: "Benchmark System" });
  const mappingMs = performance.now() - mappingStart;
  if (!mapped.diagram || !mapped.ok) throw new Error("Mapping benchmark failed.");
  const validationStart = performance.now();
  const validation = validateUseCaseDiagram(mapped.diagram);
  const validationMs = performance.now() - validationStart;
  if (validation.length > 0) throw new Error(JSON.stringify(validation));
  const layoutStart = performance.now();
  const layout = layoutUseCaseDiagram(mapped.diagram, { maxElements: 10_000 });
  const layoutMs = performance.now() - layoutStart;
  if (!layout.layout || !layout.ok) throw new Error(JSON.stringify(layout.diagnostics));
  const renderingStart = performance.now();
  const rendered = renderUseCaseSvg(mapped.diagram, layout.layout);
  const renderingMs = performance.now() - renderingStart;
  if (!rendered.svg || !rendered.ok) throw new Error("Rendering benchmark failed.");
  if (collect) {
    samples.mapping.push(mappingMs);
    samples.validation.push(validationMs);
    samples.layout.push(layoutMs);
    samples.rendering.push(renderingMs);
    samples.total.push(performance.now() - totalStart);
  }
  return { svgBytes: Buffer.byteLength(rendered.svg, "utf8") };
}

console.log("HumanUML UML generation benchmark");
console.log(`Node.js: ${process.version}; warmups: ${WARMUPS}; runs: ${RUNS}`);
console.table([run(5, 10), run(20, 50), run(50, 100)]);
