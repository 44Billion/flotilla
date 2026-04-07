import {config} from "dotenv"
import daisyui from "daisyui"
import daisyTheme from "daisyui/theme"
import themes from "daisyui/theme/object"

config({path: ".env.local"})
config({path: ".env"})

/** @type {import('tailwindcss').Config} */
export default {
  content: ["./src/**/*.{html,js,svelte,ts}"],
  darkMode: ["selector", '[data-theme="dark"]'],
  safelist: ["bg-success", "bg-warning", "w-4 h-4"],
  theme: {
    extend: {},
    zIndex: {
      none: 0,
      "nav-active": 1,
      "nav-item": 2,
      feature: 3,
      compose: 4,
      nav: 5,
      popover: 6,
      modal: 7,
      tooltip: 8,
      toast: 9,
    },
  },
  plugins: [
    daisyui({
      themes: ["light --default", "dark --prefersdark"],
    }),
    daisyTheme({
      name: "dark",
      ...themes["night"],
      "--color-base-content": "oklch(75% 0.029 256.847)",
      "--color-primary": process.env.VITE_PLATFORM_ACCENT,
      "--color-primary-content": process.env.VITE_PLATFORM_ACCENT_CONTENT || "#EAE7FF",
      "--color-secondary": process.env.VITE_PLATFORM_SECONDARY,
      "--color-secondary-content": process.env.VITE_PLATFORM_SECONDARY_CONTENT || "#EAE7FF",
    }),
    daisyTheme({
      name: "light",
      ...themes["winter"],
      "--color-neutral": "#F2F7FF",
      "--color-neutral-content": "var(--color-base-content)",
      "--color-warning": "#FD8D0B",
      "--color-primary": process.env.VITE_PLATFORM_ACCENT,
      "--color-primary-content": process.env.VITE_PLATFORM_ACCENT_CONTENT || "#EAE7FF",
      "--color-secondary": process.env.VITE_PLATFORM_SECONDARY,
      "--color-secondary-content": process.env.VITE_PLATFORM_SECONDARY_CONTENT || "#EAE7FF",
    }),
  ],
}
