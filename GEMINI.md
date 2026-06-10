# Project Overview

`mydb` is a modern web application built using **React 19**, **TypeScript**, and **Vite**. The project is initialized with a standard Vite template, providing a fast development environment with Hot Module Replacement (HMR) and an optimized production build pipeline.

## Main Technologies
- **Framework:** React 19
- **Language:** TypeScript (ES2023)
- **Build Tool:** Vite 8
- **Linting:** ESLint 10

# Building and Running

The project uses standard `npm` scripts for development and deployment:

- **Start Development Server:**
  ```bash
  npm run dev
  ```
  Launches the Vite development server with HMR.

- **Production Build:**
  ```bash
  npm run build
  ```
  Compiles TypeScript (`tsc -b`) and bundles the application for production using Vite.

- **Linting:**
  ```bash
  npm run lint
  ```
  Runs ESLint to check for code quality and style issues.

- **Preview Production Build:**
  ```bash
  npm run preview
  ```
  Serves the locally built production bundle for testing.

# Development Conventions

- **Component Style:** Use functional components with React Hooks.
- **Type Safety:** Maintain strict TypeScript typing. The project uses `tsconfig.app.json` for application code and `tsconfig.node.json` for build-time scripts.
- **Strict Mode:** Always wrap the root component in `<StrictMode>` (found in `src/main.tsx`).
- **Styling:** Modular CSS is used (`App.css`, `index.css`). Follow existing patterns for visual consistency.
- **Assets:** Store static assets in `src/assets/` and reference them using ESM imports.
- **ESLint:** Adhere to the rules defined in `eslint.config.js`.

# Project Structure

- `src/`: Main source code.
  - `main.tsx`: Application entry point.
  - `App.tsx`: Root component.
  - `assets/`: Images, icons, and other static files.
- `public/`: Assets served directly (e.g., `favicon.svg`, `icons.svg`).
- `index.html`: Base HTML template.
- `vite.config.ts`: Vite configuration.
- `tsconfig.*.json`: TypeScript configurations.
- `eslint.config.js`: ESLint configuration.
