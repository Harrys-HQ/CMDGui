# Project Rules & Guidelines

## Versioning & Releases

- **Consistency:** Whenever the application version is updated, it MUST be synchronized across all relevant files to ensure alignment. This includes:
  - `package.json` (`version` field)
  - `src-tauri/Cargo.toml` (`version` field)
  - `src-tauri/tauri.conf.json` (`version` field)
  - `src/components/SettingsModal.tsx` (UI version display)
  - `release_notes.md` (Release headers)
  - `latest.json` (Updater manifest with version, release notes, timestamps, download URLs, and minisign signatures)
- **Builds & Release Packaging:**
  - A full build and packaging (`npm run dist` / `dotenv -e .env tauri build`) MUST be performed after version updates to compile production binaries, installers, and minisign signatures.
- **Mandatory GitHub Release Assets:** Every GitHub release MUST include all of the following assets to guarantee that in-app auto-updates succeed:
  1. `latest.json` (The updater manifest resolved by the app's updater endpoint)
  2. `CmdGUI_<version>_x64-setup.exe` (NSIS installer)
  3. `CmdGUI_<version>_x64-setup.exe.sig` (NSIS signature file)
  4. `CmdGUI_<version>_x64_en-US.msi` (WiX MSI installer)
  5. `CmdGUI_<version>_x64_en-US.msi.sig` (MSI signature file)

