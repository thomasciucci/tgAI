# Tumor Study Data Visualization App (Frontend)

A frontend-only React web application for uploading, managing, and visualizing preclinical animal study data (tumor size, weight, etc.) entirely in the browser.

## Features
- Upload CSV/Excel files with animal study data
- Visualize tumor growth, inhibition, waterfall plots, weight changes, and more
- Client-side data storage (IndexedDB via Dexie.js)
- Publication-quality charts (Plotly.js)
- Export charts and data (PNG, CSV, etc.)
- No backend: all data stays on your computer

## Tech Stack
- React + TypeScript (Vite)
- Material-UI (UI components)
- Dexie.js (IndexedDB wrapper)
- Papa Parse (CSV parsing)
- SheetJS (Excel parsing)
- Plotly.js (visualization)
- simple-statistics (stats)
- react-dropzone (file upload)
- react-window (virtualized lists)

## Getting Started

1. **Install dependencies:**
   ```bash
   npm install
   ```
2. **Run the app locally:**
   ```bash
   npm run dev
   ```
3. **Build for production:**
   ```bash
   npm run build
   ```

## Deployment
- Deploy the `dist/` folder to Netlify, Vercel, GitHub Pages, or any static host.

---

*All data is processed and stored locally for privacy and offline use.*
