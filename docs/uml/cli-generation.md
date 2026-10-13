# CLI generation

```text
humanuml generate usecase requirements.txt \
  --vocabulary vocabulary.json \
  --system "Library Management System" \
  --output usecase.svg

humanuml generate usecase requirements.txt \
  --format json --output usecase.json
```

Generation requires a successful strict requirements compilation. `--partial` is rejected for diagram generation so incomplete models are never presented as complete diagrams. Existing output protection, `--force`, input protection, UTF-8 decoding, and exit codes are shared with compilation.
