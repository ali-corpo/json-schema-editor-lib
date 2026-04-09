import path from "node:path";
import { defineConfig, loadEnv } from "@rsbuild/core";
import { pluginReact } from "@rsbuild/plugin-react";

const { publicVars } = loadEnv({ prefixes: ["PUBLIC_", "VITE_"] });

export default defineConfig({
  plugins: [pluginReact()],
  server: {
    host: "::",
    port: 8080,
  },
  output: {
    // Use relative URLs so the demo works from GitHub Pages project paths.
    assetPrefix: "./",
    distPath: {
      root: "dist-demo",
    },
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  environments: {
    web: {
      source: {
        entry: {
          index: "./demo/main.tsx",
        },
        define: {
          ...publicVars,
          "import.meta.env.SSR": "false",
        },
      },
      html: {
        template: "./index.html",
      },
    },
    iframeEmbed: {
      source: {
        entry: {
          iframeEmbed: "./src/lib/iframeEmbed.ts",
        },
      },
      output: {
        // Output iframeEmbed.js at the root of dist-demo (no subdirectory)
        distPath: { js: "" },
        filename: { js: "[name].js" },
      },
      tools: {
        htmlPlugin: false,
      },
    },
  },
});
