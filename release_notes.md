## 🚀 Release: CmdGUI v2.2.0

### ✨ UI/UX Master Overhaul
- **Glassmorphic Surface Hierarchy:** Translucent acrylic backdrop blur system (`--bg-glass`, `--bg-modal`, `--bg-sidebar`) with elevated ambient border lighting and updated theme presets.
- **Spotlight Command Palette (`Ctrl+P`):** Redesigned quick switcher modal with glass cards, monospaced shortcut pills, and smooth search filtering (`>` mode).
- **Interactive Welcome Dashboard:** Modernized landing action cards with gradient glowing highlights and intuitive shortcut hints.
- **AI Shell Assistant Enhancements:** Integrated quick-prompt suggestion chips for instant natural language terminal command generation.

---

## 🚀 Release: CmdGUI v2.1.1

### 🛠️ Git & Port Terminate Safety Fixes
- **Git Modified Files List:** Fixed a bug where modified/added/deleted files inside a Git repository were not visible in the source control changes list.
- **Port Termination Safety Lock:** Hidden and disabled the `🛑 Kill` action button on standard System Services ports (under Active Ports tab) to prevent accidental system instability, replacing it with a `🔒 System` badge.

---

## 🚀 Release: CmdGUI v2.1.0

### 🛠️ Environment & Terminal Spawning Fix
- **Process Environment Variable Inheritance:** Ensured that terminal shells (like PowerShell) and other spawned backend processes inherit the full user and system environment variables (including `PATH`, `SystemRoot`, etc.) even when the Tauri application is launched from the Windows Explorer GUI.
- **Global Path Initialization on Startup:** Automatically checks and injects standard system directories (`System32`, `System32\Wbem`, `System32\WindowsPowerShell\v1.0`) into the application process `PATH` environment variable upon launch. This guarantees that all sub-commands (`git`, `powershell`, `cmd`, `net`, etc.) are resolved correctly in any launching environment.

---

## 🚀 Release: CmdGUI v2.0.0

### ✨ UI/UX Master Overhaul
- **Modern Layout:** Introduced a vertical **Activity Bar** (VS Code style) for switching between Explorer, Source Control, and Settings.
- **Improved Navigation:** Added a horizontal **Top Tab Bar** and **Breadcrumb Navigation** for better spatial awareness and faster task switching.
- **Welcome Dashboard:** A new landing page for empty states featuring quick actions, recent projects, and keyboard shortcut hints.
- **Visual Feedback:** 
  - Replaced intrusive alerts with a modern **Toast Notification** system.
  - Added **Active Pane Highlighting** for better focus awareness in split views.
- **Personalization:** 
  - Support for **Global UI Themes** (Dark, Light, and Amoled Black).
  - Enhanced **Command Palette** (Ctrl+P) with advanced Action Commands (prefix with `>`).

## 🚀 Release: CmdGUI v1.9.4

### 🐞 Bug Fixes
- **Double-Paste Fix:** Resolved an issue where `Ctrl+Shift+V` would paste text twice in the terminal by correctly preventing the browser's default paste action when handled by the application.

## 🚀 Release: CmdGUI v1.9.3

### 🛠️ Maintenance & Refinement
- **Robust Terminal Clearing:** Replaced the basic clear command with a comprehensive mechanism that clears the xterm.js buffer, the visible viewport, and the persisted local storage state. This ensures that "Clear Terminal" (via `Ctrl+Shift+L`, context menu, or command palette) is 100% reliable across sessions.

## 🚀 Release: CmdGUI v1.9.2

### 🐞 Bug Fixes
- **UI Stability:** Fixed a critical `Object.values(undefined)` crash when clicking folder icons in the sidebar caused by `react-window` v2 breaking changes.
- **Rendering Stability:** Fixed the `Terminal` component attempting to load high-performance renderers (WebGL) before the underlying DOM element was fully mounted and initialized.
- **Dependency Issues:** Updated `react-window` integration to correctly conform to its v2.x API.

## 🚀 Release: CmdGUI v1.9.1

### 🐞 Bug Fixes
- **UI Stability:** Fixed a critical `TypeError` when clicking folder icons in the sidebar caused by missing pane data during re-renders.
- **Improved Defensive Programming:** Added safety checks across the codebase to ensure tab and pane data are validated before access, preventing application crashes from corrupted state.

## 🚀 Release: CmdGUI v1.9.0

### ✨ File Explorer Operations
- **Full CRUD Support:** You can now create, rename, and delete files and folders directly from the sidebar. No more switching to Windows Explorer for simple file management.
*   **Inline Renaming:** Rename files and folders with a smooth, IDE-like inline text input.
*   **Secure Deletion:** Deleting items from the sidebar moves them to the OS Trash/Recycle Bin using Electron's secure shell API.
*   **Quick Creation:** New "New File" and "New Folder" options in the right-click context menu.
*   **Contextual Shortcuts:** Right-click folder entries to open a new terminal tab directly in that directory.

### 🎹 Universal Shortcut Compatibility
- **Non-Conflicting Modifiers:** Migrated core application shortcuts to `Ctrl + Shift` to prevent interception of standard terminal control codes.
    - **Find:** Now `Ctrl + Shift + F` (leaves `Ctrl + F` for CLI tools).
    - **Clear Screen:** Now `Ctrl + Shift + L` (leaves `Ctrl + L` for standard shell clearing).
    - **New Line:** Now `Shift + Enter` (prevents conflicts with multiline commands).
- **Terminal Pass-through:** Improved the key event handler to ensure all standard terminal shortcuts (e.g., `Ctrl + R`, `Ctrl + A`, `Ctrl + C`, `Ctrl + D`) are passed directly to the shell without being blocked by the app UI.

### 🛠️ Maintenance & Refinement
- **Secure File Service:** Implemented a new backend service for file operations with robust error handling.
- **IPC Registry Improvements:** Optimized how file-explorer actions are communicated between the sidebar and the main process.
- **UI Consistency:** Updated all "GEMINI" documentation tabs and tooltips to reflect the new shortcut defaults.

---

## 🚀 Release: CmdGUI v1.8.0

### ✨ High-Performance Rendering & Memory Efficiency
- **GPU-Accelerated Rendering:** Integrated `@xterm/addon-webgl` for ultra-fast text rendering. The terminal now uses the GPU to handle high-density output with a buttery-smooth 60fps experience.
- **Smart Rendering Fallback:** Automatically detects GPU capabilities and falls back to `@xterm/addon-canvas` or standard DOM rendering if WebGL is unavailable.
- **Tab Hibernation:** Drastically reduced memory usage by implementing "Hibernation". Tabs inactive for more than 5 minutes unmount their UI components while preserving the background process, allowing you to scale to 50+ tabs without performance loss.
- **UI Virtualization:** The **File Explorer** now uses `react-window` virtualization. Even directories with thousands of files now scroll instantly with zero lag.

### 🛠️ Stability & Error Resilience
- **IPC Data Batching:** Optimized the data flow between the Main and Renderer processes. Terminal output is now batched and throttled (16ms/64KB) to prevent UI freezes and "quitting" during heavy command execution.
- **Global Error Handling:** Implemented dedicated handlers for `uncaughtException` and `unhandledRejection` in the Main process to prevent silent crashes and improve reliability.
- **Persistent Logging:** Added a file-based logging service (`main.log`) in the user data directory to capture critical errors and diagnostic information.
- **Optimized Persistence:** Replaced aggressive 10s buffer serialization with a smart 30s "dirty-check" system using `requestIdleCallback` to ensure background saves never interrupt your work.

### 💾 Session & UI Polish
- **Enhanced Session Recovery:** Improved tab and layout persistence to ensure your workspace restores accurately even after an unclean exit.
- **Renderer-side Write Batching:** Implemented `requestAnimationFrame` batching for terminal writes, ensuring the UI stays responsive even when receiving massive amounts of data.
- **Dependency Audit:** Pruned build size and moved development-only types to devDependencies for a leaner production package.

---

## 🚀 Release: CmdGUI v1.7.3

### ✨ Graphical Stability & Startup Refinement
- **Zero-Flicker Startup:** Implemented `ready-to-show` event handling in the main process to ensure the window is fully painted before becoming visible.
- **Hardware Acceleration Control:** Added a new setting in **Appearance** to toggle Hardware Acceleration (GPU). Users experiencing graphical glitches can now disable this for a more stable experience.
- **GPU Rasterization Fix:** Applied the `--disable-gpu-rasterization` flag by default to resolve persistent horizontal artifacts and rendering glitches.
- **Terminal Rendering Polish:** Set explicit `lineHeight` and optimized `contain: content` for the terminal container to improve text rendering and scroll performance.
- **Resizing Precision:** Optimized terminal fit logic with `requestAnimationFrame` to ensure perfectly scaled terminals regardless of window size changes or high-DPI displays.

---

## 🚀 Release: CmdGUI v1.7.2

### ✨ UI Stability & Performance Optimization
- **Rubber Banding Fix:** Eliminated the "bounce" effect in the terminal by implementing `overscroll-behavior: none` and optimized `requestAnimationFrame` debouncing for terminal resizing.
- **High-Performance Sidebar:** Refactored the sidebar resizer to use CSS variables, ensuring buttery-smooth resizing with zero React re-renders during drag operations.
- **Layout Stability:** Forced flex containers to respect boundaries with `min-height: 0` and `min-width: 0`, preventing unexpected layout shifts when terminal output is large.
- **Enhanced Terminal Context Menu:** Right-click inside any terminal to access common actions directly, including Copy, Paste, and Clear.
- **Direct Terminal Splitting:** You can now split terminals horizontally or vertically directly from the terminal context menu.
- **Safety & Stability:** Improved `localStorage` safety checks and cleaned up unused project management props to ensure a smoother, more reliable experience.

---

## 🚀 Release: CmdGUI v1.7.0

### ✨ Terminal & Workspace Enhancements
- **Terminal Persistence:** Integrated `@xterm/addon-serialize` to save and restore terminal buffers. Your command output now persists across application restarts.
- **Resizable Split Panes:** Replaced static splits with `react-resizable-panels`. You can now drag to resize terminal panes within a tab.
- **Terminal Search UI:** A polished, floating search bar (`Ctrl + F`) with match navigation, case-sensitivity toggle, and smooth animations.
- **Git Status Badges:** Real-time visibility of Git branch names and dirty status indicators (clean/dirty) directly in the Project Manager sidebar.
- **Actionable Project Scripts:** Lightning-fast access to common scripts (`dev`, `start`, `build`, etc.) via badges under each project, plus a full scripts dropdown menu.

### 📂 Smart Detection Expansion
- **New Project Types:** Enhanced detection for **Go**, **Rust**, **Python**, and **Docker** (Dockerfile & Docker Compose) projects.
- **Default Scripts:** Automatically provides relevant build/run/test scripts for newly supported project types.
- **Makefile Support:** Automatically parses `Makefile` targets and exposes them as actionable scripts.

### 🛠️ UI & Maintenance
- **Scrollable Sidebar:** Added vertical scrolling to the sidebar to handle large numbers of projects and tasks while keeping the settings footer fixed.
- **Security Audit:** Fixed several high-severity vulnerabilities in dependencies (notably `tar`).
- **Orphaned Data Cleanup:** Implemented automated cleanup of terminal buffers and temporary data to prevent storage bloat.

---

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
