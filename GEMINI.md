# Project Rules & Guidelines

## Versioning & Releases

- **Consistency:** Whenever the application version is updated, it MUST be synchronized across all relevant files to ensure alignment. This includes:
  - `package.json` (`version` field)
  - `src/components/SettingsModal.tsx` (UI version display)
  - `release_notes.md` (Release headers)
- **Builds & Asset Naming:**
  - A full build and packaging (`npm run dist`) should be performed after version updates.
  - **Standardized Naming:** Assets MUST use hyphens (e.g., `CmdGUI-Setup-1.5.0.exe`) as configured in `package.json` to ensure auto-updater compatibility.
  - **Required Release Assets:** Every GitHub release MUST include the following three files:
    1. The `.exe` installer (with hyphenated name)
    2. The `.exe.blockmap` file
    3. The `latest.yml` metadata file
