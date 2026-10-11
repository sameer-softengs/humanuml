
import type { Token, TokenKind } from "../../../contracts/src/tokens.js";
import type { VocabularyRegistry } from "../../../vocabulary/src/types.js";

const KEYWORDS: Record<string, TokenKind> = {
  a: "article",
  an: "article",
  the: "article",
  can: "modal",
  may: "modal",
  must: "modal",
  cannot: "negation",
  "belongs to": "relation",
  contains: "relation",
  "is a type of": "relation"
};

export interface LexResult {
  tokens: Token[];
  unknown: Token[];
}

const isWordChar = (char: string | undefined): boolean =>
  char !== undefined && /[\p{L}\p{N}_]/u.test(char);

export function tokenize(
  input: string,
  vocabulary: VocabularyRegistry
): LexResult {
  const tokens: Token[] = [];
  const unknown: Token[] = [];

  // Collect keywords and registered vocabulary entries.
  const entries = [
    ...Object.entries(KEYWORDS).map(([word, kind]) => ({
      word,
      kind,
      canonical: word
    })),
    ...vocabulary.getAll().map(entry => ({
      word: entry.input,
      kind: entry.kind === "verb" ? "verb" as const : "noun" as const,
      canonical: entry.canonical
    }))
  ];

  // Longest match first for multi-word terms.
  entries.sort((a, b) => b.word.length - a.word.length);

  let index = 0;

  while (index < input.length) {
    if (/\s/u.test(input[index]!)) {
      index++;
      continue;
    }

    if (input[index] === ".") {
      tokens.push({
        kind: "punctuation",
        raw: ".",
        normalized: ".",
        span: { start: index, end: index + 1 }
      });
      index++;
      continue;
    }

    const remainder = input.slice(index);
    let matched = false;

    for (const entry of entries) {
      const escaped = entry.word
        .split(" ")
        .map(word =>
          word.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
        )
        .join("\\s+");

      const pattern = new RegExp(`^${escaped}`, "iu");
      const match = remainder.match(pattern);

      if (!match) continue;

      const end = index + match[0].length;

      if (
        isWordChar(input[index - 1]) ||
        isWordChar(input[end])
      ) {
        continue;
      }

      const token: Token = {
        kind: entry.kind,
        raw: match[0],
        normalized: entry.canonical,
        span: { start: index, end }
      };

      tokens.push(token);
      index = end;
      matched = true;
      break;
    }

    if (matched) continue;

    // Preserve every unrecognized input segment.
    const start = index;

    if (isWordChar(input[index])) {
      while (index < input.length && isWordChar(input[index])) {
        index++;
      }
    } else {
      index++;
    }

    const token: Token = {
      kind: "unknown",
      raw: input.slice(start, index),
      normalized: input.slice(start, index).toLowerCase(),
      span: { start, end: index }
    };

    tokens.push(token);
    unknown.push(token);
  }

  return { tokens, unknown };
}
