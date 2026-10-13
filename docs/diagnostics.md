# Diagnostics

Diagnostics contain a stable code, severity, message, and when applicable a UTF-16 source span (`start` inclusive, `end` exclusive). Important codes include `HU-INPUT-001` (empty input), `HU-INPUT-002` (source limit), `HU-LEX-001` (unknown token), `HU-SYN-*` (grammar), `HU-SEM-*` (semantic conflicts/cycles), and `HU-MOD-*` (HRM validation).

Strict compilation omits the model when any error exists. Partial compilation returns the valid portion alongside diagnostics. The CLI prints diagnostics as `SEVERITY CODE [start:end]: message` and preserves the process exit-code contract.
