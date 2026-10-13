import { defineConfig } from "tsup";

// Backend-only package (Node.js >= 20). Browsers use @mgpl-diagnostics/client.
export default defineConfig({
  entry: { index: "src/index.ts", fastify: "src/fastify.ts" },
  format: ["esm"],
  dts: true,
  target: "node20",
  platform: "node",
  splitting: true,
  clean: true,
  external: [/^node:/, "fastify"],
});
