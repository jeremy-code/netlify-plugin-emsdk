import { defineConfig } from "tsdown";

export default defineConfig({
  entry: ["src/index.js"],
  platform: "node",
  dts: false,
  exports: {
    customExports: {
      "./manifest.yml": "./dist/manifest.yml",
    },
  },
  copy: ["manifest.yml"],
});
