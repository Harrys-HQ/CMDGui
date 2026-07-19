# Product Guidelines

## UI/UX Philosophy

- **Dark Mode Default:** The application uses a dark theme (`#1e1e1e` background) to match typical developer environments.
- **Minimalist & Functional:** Focus on the terminal content. UI elements like the sidebar should be collapsible/resizable.
- **Project-Centric:** The primary organizational unit is the "Project" (a folder).

## Coding Conventions

- **Indentation:** 4-space indentation for Python (if used), standard 2-space for JS/TS/JSON (inferred from package.json). _Note: User specifically requested 4-space Python indentation in memories._
- **No Duplication:** Avoid duplicated logic.
- **Clean Code:** No excessive blank lines or "ghost" blocks.
- **Search:** Use `search_file_content` instead of `grep`.

## File Organization

- **Hooks:** Business logic should be encapsulated in custom hooks (`useProjects`, `useTabs`).
- **Components:** Functional components with TypeScript interfaces for props.
- **Backend Commands:** Rust logic should be modularized in Rust files under `src-tauri/src/` (e.g., `terminal.rs`, `project.rs`, `settings.rs`).

## Persistence Guidelines

- **Asynchronous Flow:** Renderer hooks MUST use the asynchronous `loadState` and `saveState` from `usePersistence.ts`.
- **Backend Store:** All application settings and workspace states are stored in `settings.json` within the user's data directory, managed by `settings.rs`.
- **Window State:** Window size, position, and maximization state are automatically managed by the backend process.
