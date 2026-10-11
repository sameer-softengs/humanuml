
import type {
  VocabularyRegistry
} from "../../vocabulary/src/types.js";

export interface CompileOptions {
  vocabulary: VocabularyRegistry;
  strict?: boolean;
  grammarVersion?: "CE-1";
}
