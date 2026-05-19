/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        sans: [
          "Inter",
          "ui-sans-serif",
          "system-ui",
          "-apple-system",
          "Segoe UI",
          "Roboto",
          "Helvetica Neue",
          "Arial",
          "sans-serif",
        ],
      },
      colors: {
        ink: {
          DEFAULT: "#111318",
          subdued: "#6C707A",
        },
        icon: {
          DEFAULT: "#111318",
          subdued: "#6c707a",
          disabled: "#aeb1b7",
        },
        surface: {
          DEFAULT: "#ffffff",
          hovered: "#f6f7f8",
          subdued: "#fafafa",
          strong: "#e9eaec",
        },
        line: {
          DEFAULT: "#f1f1f1",
          hovered: "#d3d6d9",
          strong: "#d3d6d9",
          selected: "#111318",
        },
        positive: {
          DEFAULT: "#00832d",
          bg: "#e7fbef",
        },
        negative: {
          DEFAULT: "#B71000",
          bg: "#FFF0ED",
        },
        brand: {
          DEFAULT: "#4969f5",
        },
        // Schedule legend colors + tinted backgrounds for assignment cards
        "sched-auto": "#1537c7",
        "sched-auto-bg": "#EEF1FC",
        "sched-manual": "#6B21A8",
        "sched-manual-bg": "#F4ECFB",
        "sched-departed": "#00832d",
        "sched-departed-bg": "#E7FBEF",
        "sched-blocked": "#949494",
        "sched-blocked-bg": "#F1F1F1",
      },
      fontSize: {
        "display-lg": ["32px", { lineHeight: "40px", letterSpacing: "-0.01em", fontWeight: "700" }],
        "display-md": ["24px", { lineHeight: "28px", letterSpacing: "-0.01em", fontWeight: "700" }],
        "title-md": ["18px", { lineHeight: "22px", letterSpacing: "-0.01em", fontWeight: "700" }],
        "body-lg": ["16px", { lineHeight: "22px", letterSpacing: "-0.01em", fontWeight: "500" }],
        "body-lg-strong": ["16px", { lineHeight: "22px", letterSpacing: "-0.01em", fontWeight: "700" }],
        "body-md": ["14px", { lineHeight: "20px", letterSpacing: "-0.01em", fontWeight: "400" }],
        "body-md-strong": ["14px", { lineHeight: "20px", letterSpacing: "-0.01em", fontWeight: "700" }],
        "body-sm": ["12px", { lineHeight: "18px", letterSpacing: "-0.01em", fontWeight: "400" }],
        "body-sm-strong": ["12px", { lineHeight: "18px", letterSpacing: "-0.01em", fontWeight: "600" }],
      },
      borderRadius: {
        button: "8px",
        card: "12px",
        tag: "9999px",
      },
      boxShadow: {
        card: "0 1px 2px 0 rgba(17, 19, 24, 0.04)",
        drag: "0 8px 24px rgba(17, 19, 24, 0.18)",
      },
    },
  },
  plugins: [],
};
