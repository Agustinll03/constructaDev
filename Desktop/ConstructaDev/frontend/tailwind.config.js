/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        constructa: {
          primary:       "#FF6B35",
          dark:          "#37474F",
          warning:       "#FFA726",
          success:       "#43A047",
          progress:      "#FB8C00",
          danger:        "#E53935",
          info:          "#1E88E5",
          bg:            "#FAFAFA",
          surface:       "#ECEFF1",
          border:        "#B0BEC5",
          secondaryText: "#607D8B",
          text:          "#263238",
        },
      },
      boxShadow: {
        card: "0 1px 3px rgba(0,0,0,0.08), 0 1px 2px rgba(0,0,0,0.04)",
        "card-md": "0 4px 12px rgba(0,0,0,0.08)",
      },
      borderRadius: {
        industrial: "4px",
      },
    },
  },
  plugins: [],
};
