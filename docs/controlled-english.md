# Controlled English CE-1

Every sentence must end with a period. Supported forms are:

```text
A <actor> <verb>.
A <actor> can|may|must <verb> [a|an|the] <entity>.
A <actor> cannot <verb> [a|an|the] <entity>.
An <entity> belongs to an <entity>.
An <entity> contains an <entity>.
An <entity> is a type of an <entity>.
```

Actors, entities, and verbs must be registered in vocabulary JSON. Aliases, plurals, and verb forms may map to registered canonical entries. Unknown words, unsupported punctuation, conjunctions, empty sentences, and missing terminators produce diagnostics; they are never silently ignored.
