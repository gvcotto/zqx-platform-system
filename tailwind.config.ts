import type { Config } from "tailwindcss";

export default {
  content: ["./app/**/*.{js,ts,jsx,tsx,mdx}", "./components/**/*.{js,ts,jsx,tsx,mdx}", "./lib/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        brand: {
          blue: "#0F62FE",
          charcoal: "#161616",
          gray: "#F4F4F4",
          white: "#FFFFFF",
          border: "rgba(22, 22, 22, 0.12)",
          muted: "#525252",
        },
      },
    },
  },
  plugins: [],
} satisfies Config;
