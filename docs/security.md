# Security model

The compiler is local-only and has no AI, network, or runtime service dependency. Compiler input is bounded to 65,536 UTF-16 code units by default and may be configured up to 1,000,000. CLI byte limits are separate: 5 MiB for requirements and 1 MiB for vocabulary.

The CLI uses fatal UTF-8 decoding, rejects non-regular input files and output symbolic links, prevents output/input aliasing through canonical parent paths, refuses accidental overwrite, and writes forced replacements through a same-directory temporary file. Filesystem checks remain subject to platform races and permissions; HumanUML does not claim complete TOCTOU or concurrent-writer protection.
