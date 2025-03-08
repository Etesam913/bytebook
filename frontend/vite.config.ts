import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";
import tailwindcss from "@tailwindcss/vite";

const ReactCompilerConfig = {
  // Your react-compiler options here
  target: "19"
};

export default defineConfig(() => ({
  plugins: [
    react({
      babel: {
        plugins: [
          ["babel-plugin-react-compiler", ReactCompilerConfig],
        ],
      },
    }),
    tailwindcss(),
  ],
  define: {
    "process.env.IS_PREACT": JSON.stringify("false"),
  },
}));
