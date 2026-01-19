# Project Rules & Guidelines

## Versioning & Releases
- **Consistency:** Whenever the application version is updated, it MUST be synchronized across all relevant files to ensure alignment. This includes:
    - `package.json` (`version` field)
    - `src/components/SettingsModal.tsx` (UI version display)
    - `release_notes.md` (Release headers)
- **Builds:** A full build and packaging (`npm run dist`) should be performed after version updates to ensure the generated executable matches the codebase state.
