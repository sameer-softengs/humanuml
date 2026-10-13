# CLI

```text
humanuml compile <requirements-file> [--output <file>] [--vocabulary <file>]
                 [--strict|--partial] [--force]
```

Defaults are `model.json`, `examples/library-vocabulary.json`, and strict mode. Requirements are limited to 5 MiB and vocabulary JSON to 1 MiB. Inputs must be regular UTF-8 files. Output refuses overwrite by default, rejects symbolic links, and uses a temporary file for forced replacement. Full race-free filesystem security cannot be guaranteed on every platform; see [security.md](security.md).
