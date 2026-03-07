## 🚀 Release: CmdGUI v1.6.1

### ✨ UI & Process Polish
- **React Modals:** Replaced native browser `window.prompt` and `window.confirm` dialogues with modern, dark-theme compatible React modals for a smoother, integrated UI.
- **Sidebar State Persistence:** The application now remembers the expanded/collapsed state of the "Projects" and "Tasks" sections across reloads.
- **Performance Optimizations:** Heavy UI components in the sidebar are now memoized, significantly reducing unnecessary re-renders when typing or navigating.

### 🛠️ Fixes
- **Process Memory Leaks:** Fixed an issue where closing a terminal tab (like a running dev server) failed to kill the underlying system process. Tab and Pane closures now explicitly terminate their associated shell processes.
- **Clear Terminal Command:** Fixed the global "Clear Terminal" shortcut to reliably clear all active panes within the focused tab.
- **Linting:** Fixed `no-control-regex` and `exhaustive-deps` ESLint warnings.

---

## 🚀 Release: CmdGUI v1.6.0

### ✨ Stay Awake Mode

- **New "Stay Awake" Feature:** Prevent your computer from locking or sleeping during long tasks or meetings. You can toggle this on/off in the **Appearance** settings.
- **Stealth Integration:** Uses native Electron `powerSaveBlocker` (same as media players and presentation apps) to reset the system idle timer without simulating detectable keyboard/mouse input.

---

## 🚀 Release: CmdGUI v1.5.0

### ✨ Advanced Tools & Keybindings

- **Customizable Keybindings:** Full keyboard control! Rebind shortcuts for terminal actions, tab navigation, and the Command Palette via the new **Keybindings** tab in Settings.
- **Workspace Management:** Capture your entire layout (tabs, panes, and directories) as a named "Workspace" to instantly resume your workflow later.
- **Command History:** A persistent, searchable log of every command you run, featuring one-click execution and star-based bookmarking.
- **Project File Explorer:** Browse project files directly from the sidebar. Double-click a folder to spawn a new terminal in that directory.
- **Horizontal & Vertical Panes:** Split any tab into multiple terminal windows for complex multi-process monitoring.
- **Quake Mode:** Toggle the application visibility with a global shortcut (`Alt + Space`) for rapid access.

### 🛠️ Polish

- **Enhanced UI Persistence:** Keybindings and custom themes now persist reliably in the main process `settings.json`.
- **Theme Editor:** Fine-grained control over terminal colors with a new Custom Theme color picker.

---

## 🚀 Release: CmdGUI v1.4.0

### ✨ UI & Organization

- **Draggable Tabs:** Reorder your active terminal tasks with simple drag-and-drop handles in the sidebar.
- **Adjustable Sidebar:** Refined sidebar resizing logic with better constraints and smooth interactions.
- **Improved Settings Layout:** Reorganized the settings modal into clearer tabs (Appearance, Docs, CLI, Workspaces, etc.) to handle the growing feature set.

---

## 🚀 Release: CmdGUI v1.3.0

### ✨ New Features

- **Project Reordering:** You can now reorganize your Project Manager list by simply dragging and dropping items.
- **Custom Keybindings:** Full control over your keyboard shortcuts! You can now customize keybindings for common actions like opening the Command Palette, creating tabs, and more via the Settings modal.
- **Keybinding Recorder:** An intuitive UI to record your preferred shortcuts.
- **Improved Workspace Organization:** Keep your most important projects at the top for faster access.

### 🛠️ Fixes & Polish

- **Settings Modal Fixes:** Resolved syntax errors and restored missing documentation content in the Settings modal (Shortcuts & Keybindings).
- **Drag-and-Drop Consistency:** Standardized drag-and-drop behavior across both Active Tasks and Project Manager sections.

---

## 🚀 Release: CmdGUI v1.2.0

### 🏗️ Architectural Refactor (Main Process)

- **Service-Oriented Architecture:** Refactored `main.js` by extracting core responsibilities into dedicated service modules:
  - `terminalService.js`: Centralized management for `node-pty` terminal processes (creation, resizing, cleanup).
  - `projectService.js`: Extracted complex project type detection logic.
  - `settingsService.js`: A new, robust service for handling application settings and persistence.
- **Improved Maintainability:** Reduced `main.js` complexity, making the Electron entry point cleaner and easier to debug.

### 💾 Persistence & Window Management

- **Enhanced Persistence Layer:** Migrated from `localStorage` to a more robust, file-based JSON store managed by the main process (`settings.json`).
- **Asynchronous Data Flow:** All application state (projects, tabs, settings) is now handled asynchronously via Electron IPC, ensuring better performance and data integrity.
- **Window State Persistence:** The application now remembers its window size, position, and maximization state between launches.

### ✨ UI/UX & Update Enhancements

- **Proactive Update Notifications:** Added a new "✨ Update Available" indicator in the `StatusBar` that appears automatically when a new version is detected.
- **Startup Update Check:** The app now performs a silent check for updates on startup in production environments.
- **Settings Modal Integration:** Users can now trigger the update process directly from the StatusBar notification or the About tab.

### 🛠️ Stability & Code Quality

- **Zero Linting Warnings:** Resolved all remaining ESLint warnings across the codebase, including React Hook dependency issues and terminal cleanup logic.
- **Performance Optimization:** Implemented `useCallback` for core hook functions (`useTabs`, `useProjects`) to prevent unnecessary re-renders.
- **Robust Terminal Cleanup:** Improved the terminal disposal logic to ensure the DOM element and associated PTY process are always correctly synchronized and freed.
- **Improved Test Suite:** Updated the testing infrastructure to handle the new asynchronous persistence model, ensuring 100% pass rate for core logic tests.

---

## 🚀 Release: CmdGUI v1.1.1

### ✨ UX & Customization

- **Conflict-Free Shortcuts:** Updated keybindings to prevent conflicts with standard shell commands:
  - **Quick Switcher:** `Ctrl + Shift + P`
  - **New Tab:** `Ctrl + Shift + N`
  - **Close Tab:** `Ctrl + Shift + W`
  - _Standard shell shortcuts like `Ctrl+P` (Previous), `Ctrl+N` (Next), and `Ctrl+W` (Delete Word) now pass through to the terminal._
- **Adjustable Font Size:** Added a slider in **Settings > Appearance** to customize the terminal font size (default: 14px).

### 🛠️ Stability & Refactoring

- **Process Cleanup:** Implemented a robust `before-quit` handler to ensure all terminal processes are killed on exit, preventing "zombie" processes.
- **Error Handling:** Added try-catch blocks to terminal creation to prevent silent crashes if the shell fails to spawn.
- **Code Quality:** Refactored global state into a new `useSettings` hook and moved terminal title logic to `terminalUtils.ts` for better maintainability.
- **Robust Persistence:** Added safety checks to `localStorage` operations to prevent crashes if storage quotas are exceeded.

---

## 🚀 Release: CmdGUI v1.1.0

### ✨ Terminal & UX Enhancements

- **Quick Switcher (`Ctrl + P`):** Added a fuzzy-search modal to instantly jump between active terminal tasks and added projects.
- **Admin Mode Visibility:** Added a visual shield badge (🛡️) to terminal tabs running with elevated privileges for better workspace awareness.
- **Integrated Terminal Search:** Added a native search bar (`Ctrl + F`) to find text within the terminal buffer. Support for "Find Next", "Find Previous", and "Close" controls.
- **Native Context Menus:** Implemented right-click menus across the application:
  - **Terminal:** Copy, Paste, and Clear Terminal.
  - **Project Manager:** Open in File Explorer, Open in VS Code, and Remove Project.
  - **Active Tasks:** Rename Task and Close Task.
- **Standardized Keyboard Shortcuts:**
  - `Ctrl + C` now intelligently copies selected text if a selection exists, or sends an interrupt (SIGINT) if not.
  - `Ctrl + Shift + C` and `Ctrl + Shift + V` remain supported for explicit clipboard operations.
- **Custom Terminal Themes:** Added a new **Appearance** settings tab allowing users to switch between four professional themes: VS Code Dark, Monokai, Solarized Dark, and One Dark.
- **Smart Search Highlighting:** Added real-time visual highlighting for search results in the Project Manager and Active Tasks list.

### 📂 Enhanced Project Manager

- **Expanded Framework Detection:** Added smart detection for even more project types:
  - **Modern JS & Tooling:** Added detection for **Vite**, **Next.js**, **Nuxt.js**, and **Deno** projects.
  - **PHP & Laravel:** Recognizes `composer.json` and specifically identifies Laravel framework projects.
  - **Ruby:** Detects `Gemfile` and `.rb` files.
  - **Java:** Recognizes Maven (`pom.xml`), Gradle (`build.gradle`), and `.java` source files.

### 🧹 Maintenance & Refactoring

- **Hook-based Architecture:** Refactored the entire application state management into modular custom hooks (`useTabs`, `useProjects`, `useSidebarResizer`), significantly improving code maintainability and performance.
- **Architectural Refactor:** Completely modularized the application sidebar. Extracted `Sidebar`, `ProjectItem`, and `TaskItem` into dedicated components.
- **State Management:** Improved persistence logic and cleaned up redundant state closures.
- **Confirmation & Permission Detection:** Improved intelligent detection system for background terminals (🔑 icon for `sudo`/passwords).

---

## 🚀 Release: CmdGUI v1.0.9

### 🛠️ Stability & Core Fixes

- **Terminal Lifecycle Management:** Fixed a critical bug where closing terminal tabs left orphaned PTY processes running in the background. Terminal processes are now reliably cleaned up on tab closure.
- **Code Quality Refactor:** Migrated "Add Terminal" menu logic from manual DOM manipulation to idiomatic React state management for better reliability and performance.

### 📂 Enhanced Project Manager

- **Expanded Smart Detection:** The Project Manager now intelligently identifies and assigns icons to a much wider range of project types:
  - **Web Frameworks:** Added support for Vue, Angular, Svelte, and generic Node.js projects.
  - **Environments:** Added detection for Docker containers (`Dockerfile`, `docker-compose.yml`).
  - **Languages & Toolkits:** Added support for .NET (`.sln`, `.csproj`) and C++ (`.cpp`, `.hpp`) projects.
- **Visual Iconography:** Updated the sidebar with unique icons for all newly supported project types to help you navigate your workspace faster.

### 🧹 Maintenance

- **Stylesheet Optimization:** Cleaned up `index.css` to remove redundant spacing and improve formatting consistency.
- **Documentation:** Updated the README to reflect the latest project detection capabilities.

---

## 🚀 Release: CmdGUI v1.0.8

### 💻 UX & Terminal Improvements

- **Smarter Task Naming:** Terminal tabs now intelligently ignore generic shell names (like "Windows PowerShell") if a project name or folder path is already set.
- **Manual Task Renaming:** Added the ability to manually rename any active task by double-clicking its title in the sidebar. Manual names are preserved and won't be overwritten by automatic terminal updates.
- **Clean Start Experience:** Removed hardcoded default projects. New installations now start with a clean, empty Project Manager list.

### ⚙️ Settings & Updates

- **Manual Update Check:** Added a "Check for Updates" button in the Settings modal under a new **ABOUT** tab.
- **Dynamic Versioning:** The app now correctly displays its current version by fetching it directly from the system.
- **UI Reorganization:** Moved app version and update controls to a dedicated About tab for a cleaner documentation experience.

### 🛠️ Stability

- **Refactored Title Logic:** Improved terminal title synchronization to prevent "stale" state issues during tab switching or directory changes.

---

## 🚀 Release: CmdGUI v1.0.7

### 🛠️ DevOps & CI/CD

- **Build Stability:** Fixed a critical issue where the application icon was missing in the CI environment, causing Windows builds to fail.
- **Repository Cleanup:** Updated `.gitignore` to correctly track necessary build assets while excluding temporary build artifacts.

---

## 🚀 Release: CmdGUI v1.0.6

## 🚀 Release: CmdGUI v1.0.5

## 🚀 Release: CmdGUI v1.0.4

### 📖 Documentation & UX

- **Reorganized Documentation:** The "Settings & Docs" modal now features a tabbed interface for better organization:
  - **GEMINI - Project:** Focuses on CmdGUI application shortcuts, interface navigation, and pro tips.
  - **GEMINI - CLI:** Centralizes Slash commands, At commands, and Shell mode documentation.
- **PowerShell ISE Integration:** Added a comprehensive list of Windows PowerShell ISE keyboard shortcuts to the GEMINI - CLI tab, providing a quick reference for editing, running, and debugging scripts.

---

## 🚀 Release: CmdGUI v1.0.3

### 💻 Terminal Enhancements & Shortcuts

- **Enhanced Keyboard Controls:** Added standard terminal shortcuts for better navigation and editing:
  - **Home/End:** `Ctrl + A` moves to start, `Ctrl + E` moves to end.
  - **Screen Management:** `Ctrl + L` to clear the terminal screen.
  - **Deletion:** `Ctrl + U` deletes to start, `Ctrl + K` deletes to end.
  - **Interrupt & Exit:** Implemented safety with double-press requirements for `Ctrl + C` (Interrupt) and `Ctrl + D` (Exit).
  - **History Search:** `Ctrl + R` for reverse history search.
- **Improved Stability:** Fixed TypeScript errors in terminal type definitions and interface declarations.

### 🛠️ Developer Experience

- **Documentation Update:** Updated the "Settings & Docs" modal with comprehensive terminal shortcut listings.
- **Build Optimization:** Resolved syntax errors that prevented successful production builds.

---

## 🚀 Release: CmdGUI v1.0.1

### New Features

- **Auto-Update Support:** CmdGUI now automatically checks for updates on startup and notifies you when a new version is ready to install.
- **New Line Shortcut:** Added `Ctrl+Enter` support in the terminal to insert a new line (useful for multi-line commands in PowerShell).

### 🛡️ Security Enhancements

- **External Link Protection:** Configured Electron to open all `http/https` links in the system's default browser instead of the app window.
- **Permission Lockdown:** Implemented a strict handler that deletes all hardware/system permission requests (camera, mic, notifications) by default.
- **Content Security Policy (CSP):** Added a robust CSP meta tag to `index.html` to prevent unauthorized script execution and XSS attacks.

### 💻 Terminal Fixes & Features

- **Clickable Links:** Integrated the `WebLinksAddon` to make URLs in the terminal interactive.
- **Clipboard Support:** Added dedicated terminal keyboard shortcuts:
  - **Copy:** `Ctrl + Shift + C`
  - **Paste:** `Ctrl + Shift + V`
- **Permission Refinement:** Updated security rules to specifically allow clipboard access while keeping all other system permissions blocked.
- **Bug Fix:** Fixed an issue where `Ctrl+Enter` was not correctly handled in the terminal.

### 📦 Repository & Release

- **GitHub CLI:** Environment prepared for automated releases.
- **Build Integrity:** Generated SHA-256 hashes to allow users to verify the authenticity of the `.exe` installer.

---

## 🚀 Initial Release: CmdGUI v1.0.0

CmdGUI is a local-first workspace manager designed for developers who value privacy and efficiency.

### Key Features

- **Persistent Workspaces:** Remembers your open tabs and projects.
- **Integrated Terminal:** Full-featured PowerShell/Bash terminals.
- **Project Management:** Organize local projects with automatic type detection.
- **Secure & Private:** No data leaves your machine.

### 🔒 Privacy & Security Guarantee

- **100% Local:** This application does not collect telemetry, usage data, or personal information.
- **Open Source:** You can review the entire source code in this repository.
- **Sandboxed:** External links open in your default browser, not inside the app.
