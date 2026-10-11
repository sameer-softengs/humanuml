
import type {
  VocabularyRegistry
} from "../../vocabulary/src/types.js";

export interface CompileOptions {
  vocabulary: VocabularyRegistry;
  strict?: boolean;
  grammarVersion?: "CE-1";

  /**
   * Maximum source length in UTF-16 code units.
   * Default: 65,536
   * Allowed range: 1–1,000,000
   */
  maxSourceLength?: number;
}
