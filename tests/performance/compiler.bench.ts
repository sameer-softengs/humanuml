import { performance } from "node:perf_hooks";

import { createCompiler } from "../../packages/core/src/index.js";
import { createVocabulary } from "../../packages/vocabulary/src/index.js";

const compiler = createCompiler();
const WARMUP_RUNS = 2;
const MEASURED_RUNS = 5;

interface Workload {
  name: string;
  sentences: number;
  source: string;
  vocabulary: ReturnType<typeof createVocabulary>;
  expectedSuccess: boolean;
}

interface Measurement {
  durationMs: number;
  heapDeltaMB: number;
  rssDeltaMB: number;
  diagnostics: number;
  ok: boolean;
  output: string;
}

function vocabulary() {
  return createVocabulary({
    actors: ["student", "librarian"],
    entities: ["book", "shelf"],
    verbs: ["borrow", "manage", "store"],
    plurals: { books: "book", shelves: "shelf" },
    verbForms: { borrows: "borrow", manages: "manage", stores: "store" }
  });
}

function repeatSentences(count: number, sentences: string[]): string {
  return Array.from(
    { length: count },
    (_, index) => sentences[index % sentences.length]!
  ).join("\n");
}

function largeVocabularyWorkload(): Workload {
  const actors = Array.from({ length: 500 }, (_, i) => `actor${i}`);
  const entities = Array.from({ length: 500 }, (_, i) => `entity${i}`);
  const verbs = Array.from({ length: 500 }, (_, i) => `verb${i}`);

  return {
    name: "large-vocabulary",
    sentences: 100,
    source: repeatSentences(100, [
      "A actor499 can verb499 entity499.",
      "A actor1 must verb1 entity1."
    ]),
    vocabulary: createVocabulary({ actors, entities, verbs }),
    expectedSuccess: true
  };
}

function workloads(): Workload[] {
  const base = vocabulary();
  const validSentences = [
    "A student can borrow books.",
    "A librarian manages books.",
    "A student must store a book.",
    "A librarian cannot borrow a book.",
    "A book belongs to a shelf.",
    "A shelf contains a book."
  ];

  return [
    ...[100, 1_000, 10_000].map(sentences => ({
      name: `duplicate-heavy-${sentences}`,
      sentences,
      source: repeatSentences(sentences, validSentences.slice(0, 2)),
      vocabulary: base,
      expectedSuccess: true
    })),
    {
      name: "diverse-valid",
      sentences: 1_000,
      source: repeatSentences(1_000, validSentences),
      vocabulary: base,
      expectedSuccess: true
    },
    {
      name: "malformed-controlled-english",
      sentences: 1_000,
      source: repeatSentences(1_000, [
        "A student can unknown books.",
        "A student can borrow books"
      ]),
      vocabulary: base,
      expectedSuccess: false
    },
    {
      name: "mixed-valid-invalid",
      sentences: 1_000,
      source: repeatSentences(1_000, [
        "A student can borrow books.",
        "A unknown can borrow books.",
        "A librarian manages books."
      ]),
      vocabulary: base,
      expectedSuccess: false
    },
    largeVocabularyWorkload()
  ];
}

function median(values: number[]): number {
  const sorted = [...values].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0
    ? (sorted[middle - 1]! + sorted[middle]!) / 2
    : sorted[middle]!;
}

function round(value: number): number {
  return Number(value.toFixed(2));
}

function measure(workload: Workload): Measurement {
  const before = process.memoryUsage();
  const start = performance.now();
  const result = compiler.compile(workload.source, {
    vocabulary: workload.vocabulary,
    strict: true,
    grammarVersion: "CE-1",
    maxSourceLength: 500_000
  });
  const durationMs = performance.now() - start;
  const after = process.memoryUsage();

  return {
    durationMs,
    heapDeltaMB: (after.heapUsed - before.heapUsed) / (1024 * 1024),
    rssDeltaMB: (after.rss - before.rss) / (1024 * 1024),
    diagnostics: result.diagnostics.length,
    ok: result.ok,
    output: JSON.stringify({ model: result.model, diagnostics: result.diagnostics })
  };
}

function run(workload: Workload) {
  for (let i = 0; i < WARMUP_RUNS; i++) measure(workload);

  const measurements = Array.from(
    { length: MEASURED_RUNS },
    () => measure(workload)
  );
  const first = measurements[0]!;
  const deterministic = measurements.every(
    measurement => measurement.output === first.output
  );
  const successful = measurements.every(
    measurement => measurement.ok === workload.expectedSuccess
  );
  const medianMs = median(measurements.map(m => m.durationMs));

  return {
    workload: workload.name,
    sentences: workload.sentences,
    successful,
    deterministic,
    medianMs: round(medianMs),
    throughputPerSecond: workload.expectedSuccess && medianMs > 0
      ? Math.round(workload.sentences / (medianMs / 1000))
      : null,
    medianHeapDeltaMB: round(median(measurements.map(m => m.heapDeltaMB))),
    medianRssDeltaMB: round(median(measurements.map(m => m.rssDeltaMB))),
    diagnostics: first.diagnostics
  };
}

console.log("HumanUML compiler benchmark");
console.log(`Node.js: ${process.version}`);
console.log(`Platform: ${process.platform} (${process.arch})`);
console.log(`Warmups: ${WARMUP_RUNS}; measured runs: ${MEASURED_RUNS}`);
const results = workloads().map(run);
console.table(results);

if (results.some(result => !result.successful || !result.deterministic)) {
  console.error("Benchmark workload verification failed.");
  process.exitCode = 1;
}

console.log("Memory values are per-run deltas, not peak measurements.");
