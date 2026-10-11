
import { performance } from "node:perf_hooks";

import {
  createCompiler
} from "../../packages/core/src/index.js";

import {
  createVocabulary
} from "../../packages/vocabulary/src/index.js";

const vocabulary = createVocabulary({
  actors: ["student", "librarian"],
  entities: ["book"],
  verbs: ["borrow", "manage"],
  plurals: {
    books: "book"
  },
  verbForms: {
    manages: "manage"
  }
});

const compiler = createCompiler();

const SIZES = [100, 1_000, 10_000];

const WARMUP_RUNS = 3;
const MEASURED_RUNS = 5;

function generateRequirements(
  count: number
): string {
  const sentences = [
    "A student can borrow books.",
    "A librarian manages books."
  ];

  return Array.from(
    { length: count },
    (_, index) => sentences[index % sentences.length]
  ).join("\n");
}

type CompileResult = ReturnType<
  typeof compiler.compile
>;

interface RunMeasurement {
  durationMs: number;
  heapDeltaMB: number;
  result: CompileResult;
}

function measureCompilation(
  source: string
): RunMeasurement {
  const memoryBefore =
    process.memoryUsage().heapUsed;

  const start = performance.now();

  const result = compiler.compile(source, {
  vocabulary,
  strict: true,
  grammarVersion: "CE-1",
  maxSourceLength: 500_000
});

  const durationMs =
    performance.now() - start;

  const memoryAfter =
    process.memoryUsage().heapUsed;

  return {
    durationMs,
    heapDeltaMB:
      (memoryAfter - memoryBefore) /
      (1024 * 1024),
    result
  };
}

function median(values: number[]): number {
  const sorted = [...values].sort(
    (a, b) => a - b
  );

  const middle = Math.floor(
    sorted.length / 2
  );

  if (sorted.length % 2 === 0) {
    return (
      sorted[middle - 1]! +
      sorted[middle]!
    ) / 2;
  }

  return sorted[middle]!;
}

function round(
  value: number
): number {
  return Number(value.toFixed(2));
}

function benchmark(size: number) {
  const source = generateRequirements(size);

  console.log(
    `\nBenchmarking ${size.toLocaleString()} sentences...`
  );

  // Warm up the compiler and JavaScript runtime.
  for (let i = 0; i < WARMUP_RUNS; i++) {
    const warmup = measureCompilation(source);

    if (!warmup.result.ok) {
      console.error(
        `\nCompilation rejected ${size} sentences.`
      );

      console.dir(
        warmup.result.diagnostics,
        { depth: null }
      );

      return {
        sentences: size,
        successful: false,
        medianMs: null,
        sentencesPerSecond: null,
        medianHeapDeltaMB: null,
        actions: warmup.result.model?.actions.length ?? 0,
        diagnostics: warmup.result.diagnostics.length
      };
    }
  }

  const measurements: RunMeasurement[] = [];

  for (let i = 0; i < MEASURED_RUNS; i++) {
    const measurement =
      measureCompilation(source);

    if (!measurement.result.ok) {
      console.error(
        `\nMeasured run ${i + 1} failed ` +
        `for ${size} sentences.`
      );

      console.dir(
        measurement.result.diagnostics,
        { depth: null }
      );

      return {
        sentences: size,
        successful: false,
        medianMs: null,
        sentencesPerSecond: null,
        medianHeapDeltaMB: null,
        actions: measurement.result.model?.actions.length ?? 0,
        diagnostics:
          measurement.result.diagnostics.length
      };
    }

    measurements.push(measurement);
  }

  const medianMs = median(
    measurements.map(
      measurement => measurement.durationMs
    )
  );

  const medianHeapDeltaMB = median(
    measurements.map(
      measurement => measurement.heapDeltaMB
    )
  );

  const lastResult =
    measurements[measurements.length - 1]!.result;

  return {
    sentences: size,
    successful: true,
    medianMs: round(medianMs),
    sentencesPerSecond:
      medianMs > 0
        ? Math.round(
            size / (medianMs / 1000)
          )
        : null,
    medianHeapDeltaMB: round(
      medianHeapDeltaMB
    ),
    actions: lastResult.model?.actions.length ?? 0,
    diagnostics: lastResult.diagnostics.length
  };
}

function main(): void {
  console.log(
    "\nHumanUML — P1-08D Performance Benchmark"
  );

  console.log(
    `Node.js: ${process.version}`
  );

  console.log(
    `Platform: ${process.platform} (${process.arch})`
  );

  console.log(
    `Warmups: ${WARMUP_RUNS} | Measured runs: ${MEASURED_RUNS}`
  );

  const results = SIZES.map(benchmark);

  console.log(
    "\nPerformance Results:"
  );

  console.table(results);

  const rejected = results.filter(
    result => !result.successful
  );

  if (rejected.length > 0) {
    console.warn(
      "\nSome workloads were rejected. " +
      "Review the compiler diagnostics above."
    );

    process.exitCode = 1;
  } else {
    console.log(
      "\nAll benchmark workloads compiled successfully."
    );
  }

  console.log(
    "\nNote: Heap deltas are not peak memory measurements."
  );
}

main();
