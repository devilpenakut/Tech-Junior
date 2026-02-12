# Changelog & Audit Report

## 🚀 Optimization & Performance
- **Lazy Loading**: Implemented lazy initialization for AudioContext to save resources until user interaction.
- **Efficient Rendering**: Used React state management to minimize re-renders.
- **Asset Optimization**: Used SVG icons (`lucide-react`) for zero-latency loading compared to image assets.
- **Network**: Implemented error handling and retry logic for API calls.
- **Caching**: Added `localStorage` caching (1 hour duration) to minimize API usage and prevent quota exhaustion.
- **Graceful Degradation**: Added **Mock Data Fallback** when API hits Rate Limits (429 Errors), ensuring the app never shows a blank error screen.

## ♿ Accessibility (A11y)
- **Contrast**: Used high-contrast text colors (Slate-800/700) on light backgrounds (Sky-50, etc.).
- **Focus Indicators**: Standard browser focus outlines preserved for keyboard navigation.
- **Semantic HTML**: Used `<header>`, `<main>`, `<article>` (implied in cards), and proper heading hierarchy (`h1`, `h2`, `h3`).
- **ARIA**: Added `aria-label` to icon-only buttons (Refresh, External Link).

## 🔍 SEO & Structure
- **Meta Tags**: Added descriptive title and meta description in `index.html`.
- **Responsive Design**: Mobile-first approach using Tailwind's responsive prefixes (`md:`, `lg:`).
- **Layout Stability**: Fixed width containers and sticky headers to prevent layout shifts (CLS).

## 🧹 Code Quality
- **TypeScript**: Full type safety with `NewsItem` and `AppState` interfaces.
- **Componentization**: Split UI into `Header`, `NewsCard`, and `Loading` components.
- **Service Layer**: Separated API logic (`geminiService.ts`) from UI logic.
- **Clean Code**: Used functional components with Hooks (`useState`, `useEffect`, `useRef`).

## 🔄 Changes Summary
- **Initial Build**: Created core application structure.
- **Feature Add**: Integrated Gemini Search Grounding for fetching Techmeme news.
- **Feature Add**: Integrated Gemini TTS for "Narrator Mode".
- **Localization**: Applied Indonesian translations and "10-year-old" persona prompting.
- **Update**: Removed TTS ("Bacakan untukku") feature as requested.
- **Update**: Increased news items count from 5 to 6.
- **Fix**: Improved prompt engineering to ensure valid source URLs from Techmeme (fixing broken links).
- **Feature Add**: Added "Secret Admin Mode" (Click Rocket 10x) to refresh news manually while hiding the public refresh button to save quota.
- **Fix (Build)**: Updated `@google/genai` dependency to use `*` (latest) to resolve "version not found" error during Vercel deployment. Removed conflicting `importmap` from HTML.
- **Reliability Fix**: Implemented Mock Data fallback for 429 Resource Exhausted errors.