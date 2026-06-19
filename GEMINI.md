# Project Rules & Guidelines

## Versioning & Releases

- **Consistency:** Whenever the application version is updated, it MUST be synchronized across all relevant files to ensure alignment. This includes:
  - `package.json` (`version` field)
  - `src/components/SettingsModal.tsx` (UI version display)
  - `release_notes.md` (Release headers)
- **Builds & Asset Naming:**
  - A full build and packaging (`npm run dist` / `tauri build`) should be performed after version updates.
  - **Required Release Assets:** Every GitHub release should include the Tauri build artifacts, which include the `.msi` installer and/or the NSIS `.exe` installer.

