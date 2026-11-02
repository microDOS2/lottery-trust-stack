import path from "path"
import react from "@vitejs/plugin-react"
import { defineConfig } from "vite"

// Optional: sandbox/preview tooling plugin — absent in CI or a fresh clone, and that's fine.
let inspectAttrPlugin: any = null;
try {
  const pluginName = ['kimi-plugin-inspect', 'react'].join('-'); // resolved only where it exists
  const mod: any = await import(/* @vite-ignore */ pluginName);
  inspectAttrPlugin = mod.inspectAttr();
} catch {
  inspectAttrPlugin = null;
}

// https://vite.dev/config/
export default defineConfig({
  base: './',
  plugins: [...(inspectAttrPlugin ? [inspectAttrPlugin] : []), react()],
  server: {
    port: 3000,
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
});
