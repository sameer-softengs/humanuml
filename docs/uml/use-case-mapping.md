# Use Case Mapping (v0.2.0)

HumanUML v0.2.0 maps the validated Human Requirements Model (HRM) to a deterministic Use Case Diagram intermediate representation (DIR). The mapping is intentionally conservative: it represents supported actions as candidate use cases and does not infer workflows or missing UML semantics.

| HRM structure | UML representation |
|---|---|
| Actor concept | UML actor |
| Asserted, permitted, or required action with an actor | Candidate use case |
| Actor performing a supported action | Actor–use-case association |
| Action evidence | Use case and association traceability |
| Duplicate equivalent actions | One logical use case/association with merged evidence |
| Actor-to-actor `specializes` relation | Actor generalization, if present in the HRM |
| Entity concept | Not an actor automatically |
| Prohibited action | No enabled association; retained in `prohibitedActions` and diagnosed when it conflicts with a supported action |

## Naming

Use case labels are derived only from the canonical action verb and optional entity object. The verb is rendered in stable title case, followed by the object name when present: `borrow` + `book` becomes `Borrow book`; `register` becomes `Register`. No domain-specific labels are invented.

## Deliberate non-mappings

This milestone does not infer `include`, `extend`, ordering, messages, system boundaries from source text, preconditions, postconditions, or new actors. Entity inheritance is not converted into actor inheritance. The default system boundary is a rendering/layout concern and may be given an explicit display label through generator options.

Supported action modalities are `asserted`, `permitted`, and `required`. `prohibited` actions remain traceable metadata and never become positive associations. Conflicting supported/prohibited actions produce a UML diagnostic; the generator does not silently present the prohibition as enabled behavior.
