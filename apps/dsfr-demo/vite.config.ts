import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// ponytail: default server host = localhost (127.0.0.1). Never set host: '0.0.0.0'.
export default defineConfig({
  plugins: [react()],
});
