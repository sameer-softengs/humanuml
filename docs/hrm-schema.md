# HRM schema

The generated model has `schemaVersion: "1.0.0"`, `language: "en"`, `grammarVersion: "CE-1"`, and sorted `concepts`, `actions`, and `relations` arrays. IDs are deterministic from canonical names and record properties. Each record contains one or more evidence items with sentence index, UTF-16 span, and exact source text.

Relations are `belongs_to`, `contains`, or `specializes`. Actions carry `asserted`, `required`, `permitted`, or `prohibited` modality. The validator checks uniqueness, references, evidence integrity, permission contradictions, and inheritance cycles.
