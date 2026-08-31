# Smart Invoice AI

Smart Invoice AI is a React + Vite application for extracting and reviewing invoice data from uploaded PDF and image files. It combines OCR processing, structured field parsing, and a review workflow for validating document details before export.

## Features

- Upload invoice PDFs and images
- OCR-based text extraction
- Structured invoice parsing for totals, vendors, dates, and line items
- Confidence scoring and validation workflow
- Review/edit data before export
- Export to CSV, JSON, or Excel-style output
- Sample invoice presets for quick testing

## Tech Stack

- React 18
- TypeScript
- Vite
- Tailwind CSS
- Tesseract.js
- PDF.js
- xlsx

## Project Structure

```bash
.
├── backend/              # FastAPI OCR backend
├── src/                  # Frontend application source
├── public/               # Static assets
├── index.html            # App entry
├── package.json          # Frontend scripts and dependencies
├── vite.config.ts        # Vite config, including GitHub Pages base path
├── README.md             # Project overview and setup
├── .gitignore            # Ignore rules
└── tailwind.config.js    # Tailwind configuration
```

## Local Development

### Prerequisites

- Node.js 18+
- npm

### Install dependencies

```bash
npm install
```

### Start the app

```bash
npm run dev
```

The application will be available at the local Vite URL, typically:

```bash
http://localhost:5173
```

### Production build

```bash
npm run build
```

This generates the production bundle in the `dist/` folder.

## Backend Setup

The repository also contains a FastAPI backend in the `backend/` folder for OCR extraction and invoice processing.

```bash
cd backend
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```

## Deployment

### GitHub Pages

This project is prepared for GitHub Pages deployment using the repository name as the base path in `vite.config.ts`.

1. Push the repo to GitHub.
2. Open the GitHub repository settings.
3. Navigate to Pages.
4. Set the source to GitHub Actions or deploy the static output from the `dist/` folder.
5. Use the generated Pages URL for the live app.

### Manual static deployment

```bash
npm run build
```

Then upload the contents of the `dist/` folder to your hosting provider or GitHub Pages branch.

## Notes

- Frontend app uses client-side OCR and document parsing.
- Some OCR features may require browser support or the backend API for full processing depending on environment.
- Build size warning is informational; it does not block successful compilation.

## License

This project is provided as-is for educational and demonstration purposes.
