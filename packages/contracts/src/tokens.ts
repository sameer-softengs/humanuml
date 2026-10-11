
import type { SourceSpan } from "./source.js";

export type TokenKind =
  | "article"
  | "modal"
  | "negation"
  | "relation"
  | "noun"
  | "verb"
  | "punctuation"
  | "unknown";

export interface Token {
  kind: TokenKind;
  raw: string;
  normalized: string;
  span: SourceSpan;
}
