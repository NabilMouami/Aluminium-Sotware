import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  base: "./", // 🔥 REQUIRED FOR ELECTRON
  resolve: {
    alias: {
      "@/components": "/src/components",
      "@/utils": "/src/utils",
      "@/hooks": "/src/hooks",
    },
  },
});
