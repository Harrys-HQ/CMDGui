# CmdGUI

**CmdGUI** is a developer-focused workspace manager designed to streamline your command-line workflow. Built with **Electron**, **React**, and **TypeScript**, it serves as a central hub for all your active projects, allowing you to manage multiple terminal sessions (PowerShell/Bash) with a persistent state that remembers your setup between launches.

## Key Features

*   **🖥️ Integrated Terminal Environment:** Full-featured terminal emulation using `xterm.js` and `node-pty`.
*   **📂 Project Manager:** Easily add, remove, and switch between project directories from a collapsible sidebar.
*   **🏷️ Smart Detection:** Automatically identifies and assigns icons to project types (React, Python, Rust, Go, Git).
*   **📑 Multi-Tab Interface:** Run independent terminal sessions for different tasks or projects simultaneously.
*   **💾 Persistent State:** Your open tabs, sidebar width, and added projects are saved automatically.
*   **🛡️ Admin Mode:** Built-in support for relaunching with elevated privileges for administrative tasks.

## Tech Stack

*   **Frontend:** React 19, Vite, TypeScript
*   **Backend:** Electron, Node.js
*   **Terminal:** xterm.js, node-pty, xterm-addon-fit

## Getting Started

### Prerequisites

*   Node.js (v16 or higher recommended)
*   npm

### Installation

1.  Clone the repository.
2.  Install dependencies:

    ```bash
    npm install
    ```

### Development

To run the application in development mode (React dev server + Electron):

```bash
npm run dev
```

### Building

To build the application for production (creates an executable):

```bash
npm run dist
```

## Available Commands

The application provides a "Settings & Docs" modal that features a tabbed interface:
*   **GEMINI - Project:** Documentation for CmdGUI application shortcuts and interface navigation.
*   **GEMINI - CLI:** A comprehensive list of Gemini CLI slash commands and Windows PowerShell ISE keyboard shortcuts.

## License

ISC