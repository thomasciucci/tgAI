# 🧬 Tumor Study Data Analyzer

A powerful, browser-based tool for analyzing and visualizing preclinical animal study data. Upload Excel/CSV files, import data with flexible column mapping, and generate comprehensive visualizations including parameter plots, TGI analysis, and waterfall charts.

## ✨ Features

- **📊 Data Import**: Support for Excel and CSV files with flexible column mapping
- **🔍 Parameter Visualization**: Interactive plots for any measured parameter over time
- **📈 TGI Analysis**: Tumor Growth Inhibition analysis with statistical comparisons  
- **📊 Waterfall Plots**: Best response visualization for treatment efficacy
- **📄 PDF Export**: Generate complete reports with all visualizations
- **🌐 Browser-Based**: No installation required, works entirely in your browser
- **🔒 Privacy-First**: All data processing happens locally, nothing sent to servers

## 🚀 Quick Deployment Links

**🔗 Deploy to Vercel**: 
```
https://vercel.com/new/clone?repository-url=https://github.com/thomasciucci/tgAI&project-name=tumor-study-analyzer
```

**🔗 Deploy to Netlify**:
```  
https://app.netlify.com/start/deploy?repository=https://github.com/thomasciucci/tgAI
```

## 🛠️ Local Development

```bash
git clone https://github.com/thomasciucci/tgAI.git
cd tgAI/frontend
npm install
npm run dev
```

Open http://localhost:5173 in your browser.

## 📱 Usage

1. **Upload Data**: Drag & drop or select your Excel/CSV file
2. **Map Columns**: Configure which columns contain animal IDs, timepoints, and parameters  
3. **Import Metadata**: Optionally add group/treatment information from another sheet
4. **Visualize**: Explore your data with interactive charts and statistical analysis
5. **Export**: Generate PDF reports with all visualizations

## 🏗️ Tech Stack

- **Frontend**: React 18 + TypeScript + Vite
- **UI**: Material-UI (MUI) with custom styling
- **Charts**: Plotly.js for interactive visualizations
- **Data Processing**: Papa Parse (CSV), SheetJS (Excel)
- **PDF Generation**: jsPDF + html2canvas
- **Statistics**: Simple Statistics library

## 📦 Build Commands

```bash
# Install dependencies
npm install

# Development server
npm run dev

# Production build
npm run build

# Preview build
npm run preview
```

## 🌐 Deployment Options

### Vercel (Recommended - Instant)
1. Connect your GitHub repo to Vercel
2. Set build settings: `npm run build`, output: `dist`
3. Deploy automatically on push

### Netlify  
1. Connect repo, set build: `npm run build`, publish: `dist`
2. Auto-deploy on commits

### GitHub Pages
1. Enable Pages in repo settings
2. Use the included GitHub Actions workflow  

---

*Built with ❤️ for the scientific research community. All data stays private in your browser.*
