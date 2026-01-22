## 🚀 Release: CmdGUI v1.1.0

### ✨ Terminal & UX Enhancements
*   **Quick Switcher (`Ctrl + P`):** Added a fuzzy-search modal to instantly jump between active terminal tasks and added projects.
*   **Admin Mode Visibility:** Added a visual shield badge (🛡️) to terminal tabs running with elevated privileges for better workspace awareness.
*   **Integrated Terminal Search:** Added a native search bar (`Ctrl + F`) to find text within the terminal buffer. Support for "Find Next", "Find Previous", and "Close" controls.
*   **Native Context Menus:** Implemented right-click menus across the application:
    *   **Terminal:** Copy, Paste, and Clear Terminal.
    *   **Project Manager:** Open in File Explorer, Open in VS Code, and Remove Project.
    *   **Active Tasks:** Rename Task and Close Task.
*   **Standardized Keyboard Shortcuts:** 
    *   `Ctrl + C` now intelligently copies selected text if a selection exists, or sends an interrupt (SIGINT) if not.
    *   `Ctrl + Shift + C` and `Ctrl + Shift + V` remain supported for explicit clipboard operations.
*   **Custom Terminal Themes:** Added a new **Appearance** settings tab allowing users to switch between four professional themes: VS Code Dark, Monokai, Solarized Dark, and One Dark.
*   **Smart Search Highlighting:** Added real-time visual highlighting for search results in the Project Manager and Active Tasks list.

### 📂 Enhanced Project Manager
*   **Expanded Framework Detection:** Added smart detection for even more project types:
    *   **Modern JS & Tooling:** Added detection for **Vite**, **Next.js**, **Nuxt.js**, and **Deno** projects.
    *   **PHP & Laravel:** Recognizes `composer.json` and specifically identifies Laravel framework projects.
    *   **Ruby:** Detects `Gemfile` and `.rb` files.
    *   **Java:** Recognizes Maven (`pom.xml`), Gradle (`build.gradle`), and `.java` source files.

### 🧹 Maintenance & Refactoring
*   **Hook-based Architecture:** Refactored the entire application state management into modular custom hooks (`useTabs`, `useProjects`, `useSidebarResizer`), significantly improving code maintainability and performance.
*   **Architectural Refactor:** Completely modularized the application sidebar. Extracted `Sidebar`, `ProjectItem`, and `TaskItem` into dedicated components.
*   **State Management:** Improved persistence logic and cleaned up redundant state closures.
*   **Confirmation & Permission Detection:** Improved intelligent detection system for background terminals (🔑 icon for `sudo`/passwords).

---

## 🚀 Release: CmdGUI v1.0.9

### 🛠️ Stability & Core Fixes
*   **Terminal Lifecycle Management:** Fixed a critical bug where closing terminal tabs left orphaned PTY processes running in the background. Terminal processes are now reliably cleaned up on tab closure.
*   **Code Quality Refactor:** Migrated "Add Terminal" menu logic from manual DOM manipulation to idiomatic React state management for better reliability and performance.

### 📂 Enhanced Project Manager
*   **Expanded Smart Detection:** The Project Manager now intelligently identifies and assigns icons to a much wider range of project types:
    *   **Web Frameworks:** Added support for Vue, Angular, Svelte, and generic Node.js projects.
    *   **Environments:** Added detection for Docker containers (`Dockerfile`, `docker-compose.yml`).
    *   **Languages & Toolkits:** Added support for .NET (`.sln`, `.csproj`) and C++ (`.cpp`, `.hpp`) projects.
*   **Visual Iconography:** Updated the sidebar with unique icons for all newly supported project types to help you navigate your workspace faster.

### 🧹 Maintenance
*   **Stylesheet Optimization:** Cleaned up `index.css` to remove redundant spacing and improve formatting consistency.
*   **Documentation:** Updated the README to reflect the latest project detection capabilities.

---

## 🚀 Release: CmdGUI v1.0.8

### 💻 UX & Terminal Improvements
*   **Smarter Task Naming:** Terminal tabs now intelligently ignore generic shell names (like "Windows PowerShell") if a project name or folder path is already set.
*   **Manual Task Renaming:** Added the ability to manually rename any active task by double-clicking its title in the sidebar. Manual names are preserved and won't be overwritten by automatic terminal updates.
*   **Clean Start Experience:** Removed hardcoded default projects. New installations now start with a clean, empty Project Manager list.

### ⚙️ Settings & Updates
*   **Manual Update Check:** Added a "Check for Updates" button in the Settings modal under a new **ABOUT** tab.
*   **Dynamic Versioning:** The app now correctly displays its current version by fetching it directly from the system.
*   **UI Reorganization:** Moved app version and update controls to a dedicated About tab for a cleaner documentation experience.

### 🛠️ Stability
*   **Refactored Title Logic:** Improved terminal title synchronization to prevent "stale" state issues during tab switching or directory changes.

---

## 🚀 Release: CmdGUI v1.0.7

### 🛠️ DevOps & CI/CD
*   **Build Stability:** Fixed a critical issue where the application icon was missing in the CI environment, causing Windows builds to fail.
*   **Repository Cleanup:** Updated `.gitignore` to correctly track necessary build assets while excluding temporary build artifacts.

---

## 🚀 Release: CmdGUI v1.0.6

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
