# Project Overview: MYDB

`mydb` is a modern, responsive web application for searching and tracking movies, series, and games. It leverages the **OMDb API** to fetch data and provides a seamless user experience with infinite scrolling and advanced filtering.

## Main Technologies
- **Framework:** React 19
- **Navigation:** React Router 7 (`react-router-dom`)
- **Styling:** Tailwind CSS v4
- **Icons:** Heroicons
- **Language:** TypeScript (ES2023)
- **Build Tool:** Vite 8

# Project Architecture

The application is organized into a modular structure:

- `src/pages/`: Contains page-level components.
  - `Search.tsx`: Advanced search interface with filters (Title, Type, Year) and infinite scroll implementation using `IntersectionObserver`.
  - `Seen.tsx`: Placeholder for the personalized list of watched content.
- `src/components/`: Reusable UI components.
  - `MovieCard.tsx`: Displays movie details (Poster, Title, Year, Type) with dynamic icons and broken image handling.
- `src/types.ts`: Centralized TypeScript interfaces (`Movie`, `OmdbSearchResponse`, etc.).
- `src/App.tsx`: Main layout, global navigation header (MYDB branding), and route definitions.

# Key Features

- **Advanced Search:** Filter by title, type (Movie, Series, Game), and year.
- **Infinite Scroll:** Automatically loads the next 10 results from OMDb as the user scrolls.
- **Robust Image Handling:** Automatically falls back to a placeholder if a movie poster URL returns a 404 or is "N/A".
- **Responsive Design:** Optimized for both mobile and desktop viewports.
- **Environment Management:** API keys are managed via `.env.local` using the `VITE_` prefix.

# Building and Running

- **Development:** `npm run dev`
- **Build:** `npm run build` (Runs `tsc` and `vite build`)
- **Linting:** `npm run lint`

# Development Conventions

- **State Management:** Use standard React Hooks (`useState`, `useCallback`, `useRef`).
- **Types:** Always define interfaces for API responses and component props in `src/types.ts`.
- **Styling:** Use Tailwind utility classes directly in components. Follow the established dark theme (`slate-900` background).
- **Icons:** Prefer Heroicons (outline version) for consistency.
