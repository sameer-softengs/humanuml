
import type {
  Token
} from "../../../contracts/src/tokens.js";

import type {
  DocumentAst,
  AstStatement,
  ActionModality
} from "../../../contracts/src/ast.js";

import type {
  Diagnostic
} from "../../../contracts/src/diagnostics.js";

export interface ParseResult {
  ast: DocumentAst;
  diagnostics: Diagnostic[];
  ok: boolean;
}

function syntaxError(
  message: string,
  token?: Token
): Diagnostic {
  return {
    code: "HU-SYN-001",
    severity: "error",
    message,
    ...(token ? { span: token.span } : {})
  };
}

function isNoun(token: Token | undefined): boolean {
  return token?.kind === "noun";
}

function parseNoun(
  tokens: Token[],
  position: number
): { name: string; next: number } | undefined {
  let index = position;

  if (tokens[index]?.kind === "article") {
    index++;
  }

  const token = tokens[index];

  if (!isNoun(token)) {
    return undefined;
  }

  return {
    name: token!.normalized,
    next: index + 1
  };
}

function parseSentence(
  tokens: Token[],
  source: string
): {
  statement?: AstStatement;
  diagnostic?: Diagnostic;
} {
  const first = tokens[0];
  const last = tokens[tokens.length - 1];

  if (!first || !last) {
    return {
      diagnostic: syntaxError("Empty sentence.")
    };
  }

  const span = {
    start: first.span.start,
    end: last.span.end
  };

  const sourceText = source.slice(span.start, span.end);

  if (tokens.some(t => t.kind === "unknown")) {
    return {
      diagnostic: syntaxError(
        "Sentence contains unrecognized vocabulary.",
        tokens.find(t => t.kind === "unknown")
      )
    };
  }

  const subject = parseNoun(tokens, 0);

  if (!subject) {
    return {
      diagnostic: syntaxError(
        "Expected a registered noun phrase.",
        first
      )
    };
  }

  let index = subject.next;
  const operator = tokens[index];

  if (!operator) {
    return {
      diagnostic: syntaxError(
        "Expected an action or relationship.",
        last
      )
    };
  }

  // Relationship: Book belongs to Category
  // Relationship: Order contains Products
  if (
    operator.kind === "relation" &&
    (operator.normalized === "belongs to" ||
     operator.normalized === "contains")
  ) {
    const object = parseNoun(tokens, index + 1);

    if (!object || object.next !== tokens.length) {
      return {
        diagnostic: syntaxError(
          "Expected one valid relationship object.",
          operator
        )
      };
    }

    return {
      statement: {
        kind: "relation",
        subject: subject.name,
        predicate:
          operator.normalized === "contains"
            ? "contains"
            : "belongs_to",
        object: object.name,
        span,
        sourceText
      }
    };
  }

  // Inheritance: Manager is a type of Employee
  if (
    operator.kind === "relation" &&
    operator.normalized === "is a type of"
  ) {
    const parent = parseNoun(tokens, index + 1);

    if (!parent || parent.next !== tokens.length) {
      return {
        diagnostic: syntaxError(
          "Expected a parent entity.",
          operator
        )
      };
    }

    return {
      statement: {
        kind: "inheritance",
        child: subject.name,
        parent: parent.name,
        span,
        sourceText
      }
    };
  }

  let modality: ActionModality = "asserted";

  if (operator.kind === "modal") {
    modality =
      operator.normalized === "must"
        ? "required"
        : "permitted";

    index++;
  } else if (operator.kind === "negation") {
    if (operator.normalized !== "cannot") {
      return {
        diagnostic: syntaxError(
          "Unsupported negation.",
          operator
        )
      };
    }

    modality = "prohibited";
    index++;
  }

  const verb = tokens[index];

  if (!verb || verb.kind !== "verb") {
    return {
      diagnostic: syntaxError(
        "Expected a registered action verb.",
        verb ?? operator
      )
    };
  }

  index++;

  let objectName: string | undefined;

  if (index < tokens.length) {
    const object = parseNoun(tokens, index);

    if (!object || object.next !== tokens.length) {
      return {
        diagnostic: syntaxError(
          "Unsupported action sentence structure.",
          tokens[index]
        )
      };
    }

    objectName = object.name;
  }

  const statement: AstStatement = {
    kind: "action",
    actor: subject.name,
    verb: verb.normalized,
    modality,
    ...(objectName !== undefined
      ? { object: objectName }
      : {}),
    span,
    sourceText
  };

  return { statement };
}

export function parse(
  tokens: Token[],
  source: string
): ParseResult {
  const statements: AstStatement[] = [];
  const diagnostics: Diagnostic[] = [];

  let sentenceTokens: Token[] = [];

  function processSentence(): void {
    if (sentenceTokens.length === 0) {
      return;
    }

    const result = parseSentence(
      sentenceTokens,
      source
    );

    if (result.statement) {
      statements.push(result.statement);
    }

    if (result.diagnostic) {
      diagnostics.push(result.diagnostic);
    }

    sentenceTokens = [];
  }

 
for (const token of tokens) {
  if (
    token.kind === "punctuation" &&
    token.normalized === "."
  ) {
    // Reject consecutive periods and empty sentences.
    if (sentenceTokens.length === 0) {
      diagnostics.push({
        code: "HU-SYN-003",
        severity: "error",
        message: "Empty sentence is not allowed.",
        span: token.span
      });
    } else {
      // Parse the completed sentence.
      processSentence();
    }
  } else {
    // CRITICAL:
    // Preserve all non-terminator tokens.
    sentenceTokens.push(token);
  }
}


  // Do not silently accept unterminated sentences.
  if (sentenceTokens.length > 0) {
    diagnostics.push({
      code: "HU-SYN-002",
      severity: "error",
      message: "Sentence must end with a period.",
      span: {
        start: sentenceTokens[0]!.span.start,
        end: sentenceTokens[
          sentenceTokens.length - 1
        ]!.span.end
      }
    });
  }

  return {
    ast: {
      kind: "document",
      statements
    },
    diagnostics,
    ok: diagnostics.length === 0
  };
}
