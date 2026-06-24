import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// Configuração do Vite. O deploy na Vercel detecta este projeto automaticamente.
export default defineConfig({
  plugins: [react()],
});
