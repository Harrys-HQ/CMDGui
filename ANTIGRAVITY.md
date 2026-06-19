# Antigravity CLI Rules & Guidelines: CmdGUI

This file outlines the persistent project context, guidelines, and constraints for **Antigravity CLI** to ensure high-fidelity codebase modifications, consistent builds, and stable releases.

---

## 📌 Standard Versioning & Release Alignment

Whenever the application version is updated, it **MUST** be synchronized across all of the following locations:
1. **`package.json`**: Update the `"version"` field.
2. **`src/components/SettingsModal.tsx`**: Update the `appVersion` React state variable.
3. **`release_notes.md`**: Update/append release notes under the corresponding version header.

---

## 📦 Production Builds & Asset Naming

*   **Production Build Command:** Always run `npm run dist` (which runs `tauri build`) to package the production-ready Tauri app.
*   **Required GitHub Release Assets:** Every GitHub release should contain the compiled Tauri build artifacts (such as `.msi` and/or `.exe` installers).

---

## 🛠️ Verification & Development Rules

*   **Syntax Errors Protection:** Always run `npm run build` to verify TypeScript (`tsc`) compilation and Vite bundling pass with zero errors before pushing or completing a phase.
*   **Coding Standards:**
    *   Maintain standard 4-space Python indentation (if working on python scripts).
    *   Maintain standard 2-space React/TypeScript indentation, clean imports, and zero duplicated logic.
