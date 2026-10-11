
export type VocabularyKind = "actor" | "entity" | "verb";

export interface VocabularyConfig {
  actors: string[];
  entities: string[];
  verbs: string[];
  aliases?: Record<string, string>;
  plurals?: Record<string, string>;
  verbForms?: Record<string, string>;
}

export interface VocabularyMatch {
  input: string;
  canonical: string;
  kind: VocabularyKind;
}

export interface VocabularyRegistry {
  lookup(input: string): VocabularyMatch | undefined;
  has(input: string): boolean;
  getAll(): VocabularyMatch[];
}
