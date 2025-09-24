// tailwind.config.ts
import type { Config } from "tailwindcss";

export default {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "var(--background)",
        foreground: "var(--foreground)",
        // --- THÊM 2 MÀU NÀY ---
        primary: "#6366f1", // indigo-500
        accent: "#a855f7", // purple-500
      },
    },
  },
  plugins: [],
} satisfies Config;
