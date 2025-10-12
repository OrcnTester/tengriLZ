/** @type {import('tailwindcss').Config} */
export default {
    content: [
        "./index.html",
        "./src/**/*.{js,ts,jsx,tsx}",
    ],
    theme: {
        extend: {
            colors: {
                bg: '#0b1324',
                panel: 'hsl(222, 47%, 11%)',
                muted: '#243247',
                fg: '#e5eefc',
                'fg-dim': '#a7b6cf',
                brand: '#60a5fa',
                accent: '#22c55e',
                warn: '#f97316',
            },
            boxShadow: {
                'custom': '0 8px 24px rgba(2, 8, 23, .45)',
            },
            borderRadius: {
                'custom': '14px',
            },
            width: {
                'panel': '450px',
            }
        },
    },
    plugins: [],
}
