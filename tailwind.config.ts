import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}", // Phải có dòng này để quét component LeaderboardTable
    "./app/**/*.{js,ts,jsx,tsx,mdx}",        // Phải có dòng này để quét page.tsx
    "./src/**/*.{js,ts,jsx,tsx,mdx}",        // Nếu bạn dùng folder src
  ],
  theme: {
    extend: {
      colors: {
        // Brand Colors
        primary: {
          DEFAULT: "#FF5500", // Volt Orange
          dark: "#C82800",    // Deep Magma
        },
        // Backgrounds
        void: "#09090B",      // Void Black
        gunmetal: "#18181B",  // Card BG
        // Status
        win: "#10B981",       // Neon Green
        loss: "#EF4444",      // Desaturated Red
        // Metals (cho Gradient Text Top 1)
        gold: { from: "#FCD34D", to: "#B45309" },
      },
      fontFamily: {
        teko: ["var(--font-teko)"], // Font cho số điểm, tên đội [cite: 355]
        inter: ["var(--font-inter)"],
      },
      backgroundImage: {
        'noise': "url('/noise-texture.png')", // [cite: 367]
      }
    },
  },
  plugins: [],
};
export default config;