import { defineConfig } from "tsup";

export default defineConfig({
  entry: { index: "src/index.ts", pdf: "src/pdf.ts", server: "src/server.ts" },
  format: ["esm"],
  dts: true,
  target: "es2022",
  platform: "neutral",
  splitting: true,
  clean: true,
  external: [/^node:/],
});
