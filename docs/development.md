# Development

Requirements: Node.js 24, pnpm 10, and a Windows-compatible shell where applicable.

```powershell
pnpm install --frozen-lockfile
pnpm typecheck
pnpm test
pnpm build
pnpm exec vitest run tests/performance/compiler.bench.ts
```

Packages are built locally and can be packed with `pnpm --filter @humanuml/core pack` and `pnpm --filter @humanuml/cli pack`. The repository does not publish automatically. Keep changes deterministic, preserve evidence, add regression tests for defects, and update the changelog and release checklist for externally observable changes.
