
import type {
  VocabularyConfig,
  VocabularyKind,
  VocabularyMatch,
  VocabularyRegistry
} from "./types.js";

function normalize(value: string): string {
  return value.trim().toLowerCase().replace(/\s+/g, " ");
}

export function createVocabulary(
  config: VocabularyConfig
): VocabularyRegistry {
  const entries = new Map<string, VocabularyMatch>();

  function register(
    input: string,
    canonical: string,
    kind: VocabularyKind
  ): void {
    const key = normalize(input);
    const target = normalize(canonical);

    if (!key || !target) {
      throw new Error("Vocabulary entries cannot be empty.");
    }

    const existing = entries.get(key);

    if (
      existing &&
      (existing.canonical !== target || existing.kind !== kind)
    ) {
      throw new Error(
        `Conflicting vocabulary entry: "${key}".`
      );
    }

    entries.set(key, {
      input: key,
      canonical: target,
      kind
    });
  }

  const categories: Array<
    [VocabularyKind, string[]]
  > = [
    ["actor", config.actors],
    ["entity", config.entities],
    ["verb", config.verbs]
  ];

  for (const [kind, values] of categories) {
    for (const value of values) {
      register(value, value, kind);
    }
  }

  function registerMapped(
    mapping: Record<string, string> | undefined,
    expectedKind?: VocabularyKind
  ): void {
    if (!mapping) return;

    for (const [input, canonical] of Object.entries(mapping)) {
      const target = entries.get(normalize(canonical));

      if (!target) {
        throw new Error(
          `Unknown canonical vocabulary entry: "${canonical}".`
        );
      }

      if (expectedKind && target.kind !== expectedKind) {
        throw new Error(
          `Expected ${expectedKind} target for "${input}".`
        );
      }

      register(input, target.canonical, target.kind);
    }
  }

  registerMapped(config.aliases);
  registerMapped(config.plurals);
  registerMapped(config.verbForms, "verb");

  return {
    lookup(input) {
      return entries.get(normalize(input));
    },

    has(input) {
      return entries.has(normalize(input));
    },

    getAll() {
      return [...entries.values()]
        .map(entry => ({ ...entry }))
        .sort((a, b) => a.input.localeCompare(b.input, "en"));
    }
  };
}
