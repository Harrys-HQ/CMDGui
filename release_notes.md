## 🚀 Release: CmdGUI v1.0.6

### 🛠️ DevOps & CI/CD
*   **Resilient Build Workflow:** Disabled `fail-fast` in GitHub Actions to ensure Windows and macOS builds complete even if the Linux build encounters errors.
*   **Priority Builds:** Configured the workflow to allow the Ubuntu build to fail without cancelling the entire release process.

---

## 🚀 Release: CmdGUI v1.0.5

## 🚀 Release: CmdGUI v1.0.4

### 📖 Documentation & UX
*   **Reorganized Documentation:** The "Settings & Docs" modal now features a tabbed interface for better organization:
    *   **GEMINI - Project:** Focuses on CmdGUI application shortcuts, interface navigation, and pro tips.
    *   **GEMINI - CLI:** Centralizes Slash commands, At commands, and Shell mode documentation.
*   **PowerShell ISE Integration:** Added a comprehensive list of Windows PowerShell ISE keyboard shortcuts to the GEMINI - CLI tab, providing a quick reference for editing, running, and debugging scripts.

---

## 🚀 Release: CmdGUI v1.0.3

### 💻 Terminal Enhancements & Shortcuts
*   **Enhanced Keyboard Controls:** Added standard terminal shortcuts for better navigation and editing:
    *   **Home/End:** `Ctrl + A` moves to start, `Ctrl + E` moves to end.
    *   **Screen Management:** `Ctrl + L` to clear the terminal screen.
    *   **Deletion:** `Ctrl + U` deletes to start, `Ctrl + K` deletes to end.
    *   **Interrupt & Exit:** Implemented safety with double-press requirements for `Ctrl + C` (Interrupt) and `Ctrl + D` (Exit).
    *   **History Search:** `Ctrl + R` for reverse history search.
*   **Improved Stability:** Fixed TypeScript errors in terminal type definitions and interface declarations.

### 🛠️ Developer Experience
*   **Documentation Update:** Updated the "Settings & Docs" modal with comprehensive terminal shortcut listings.
*   **Build Optimization:** Resolved syntax errors that prevented successful production builds.

---

## 🚀 Release: CmdGUI v1.0.1

### New Features
*   **Auto-Update Support:** CmdGUI now automatically checks for updates on startup and notifies you when a new version is ready to install.
*   **New Line Shortcut:** Added `Ctrl+Enter` support in the terminal to insert a new line (useful for multi-line commands in PowerShell).

### 🛡️ Security Enhancements
*   **External Link Protection:** Configured Electron to open all `http/https` links in the system's default browser instead of the app window.
*   **Permission Lockdown:** Implemented a strict handler that deletes all hardware/system permission requests (camera, mic, notifications) by default.
*   **Content Security Policy (CSP):** Added a robust CSP meta tag to `index.html` to prevent unauthorized script execution and XSS attacks.

### 💻 Terminal Fixes & Features
*   **Clickable Links:** Integrated the `WebLinksAddon` to make URLs in the terminal interactive.
*   **Clipboard Support:** Added dedicated terminal keyboard shortcuts:
    *   **Copy:** `Ctrl + Shift + C`
    *   **Paste:** `Ctrl + Shift + V`
*   **Permission Refinement:** Updated security rules to specifically allow clipboard access while keeping all other system permissions blocked.
*   **Bug Fix:** Fixed an issue where `Ctrl+Enter` was not correctly handled in the terminal.

### 📦 Repository & Release
*   **GitHub CLI:** Environment prepared for automated releases.
*   **Build Integrity:** Generated SHA-256 hashes to allow users to verify the authenticity of the `.exe` installer.

---

## 🚀 Initial Release: CmdGUI v1.0.0

CmdGUI is a local-first workspace manager designed for developers who value privacy and efficiency.

### Key Features
*   **Persistent Workspaces:** Remembers your open tabs and projects.
*   **Integrated Terminal:** Full-featured PowerShell/Bash terminals.
*   **Project Management:** Organize local projects with automatic type detection.
*   **Secure & Private:** No data leaves your machine.

### 🔒 Privacy & Security Guarantee
*   **100% Local:** This application does not collect telemetry, usage data, or personal information.
*   **Open Source:** You can review the entire source code in this repository.
*   **Sandboxed:** External links open in your default browser, not inside the app.
