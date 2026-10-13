import { defineConfig } from "tsup";

export default defineConfig([
  {
    name: "humanuml-core",
    entry: {
      index: "packages/core/src/index.ts"
    },
    outDir: "packages/core/dist",
    format: ["esm"],
    platform: "neutral",
    target: "es2022",
    bundle: true,
    dts: true,
    sourcemap: true,
    clean: true,
    splitting: false,
    external: [],
    outExtension: () => ({
      js: ".mjs"
    })
  },
  {
    name: "humanuml-cli",
    entry: {
      index: "apps/cli/src/index.ts"
    },
    outDir: "apps/cli/dist",
    format: ["esm"],
    platform: "node",
    target: "node24",
    bundle: true,
    dts: false,
    sourcemap: true,
    clean: true,
    splitting: false,
    outExtension: () => ({
      js: ".mjs"
    })
  },
  {
    name: "humanuml-uml-core",
    entry: {
      index: "packages/uml-core/src/index.ts"
    },
    outDir: "packages/uml-core/dist",
    format: ["esm"],
    platform: "neutral",
    target: "es2022",
    bundle: true,
    dts: true,
    sourcemap: true,
    clean: true,
    splitting: false,
    external: [],
    outExtension: () => ({
      js: ".mjs"
    })
  }
]);
