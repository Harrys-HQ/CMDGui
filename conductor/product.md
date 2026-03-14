# Product Definition: CmdGUI

**CmdGUI** is a developer-focused workspace manager designed to streamline command-line workflows. It acts as a central hub for active projects, allowing users to manage multiple terminal sessions with a persistent state that remembers setup between launches.

## Core Philosophy

- **Workspace Manager:** Organizes workflow around specific _projects_ rather than just shells.
- **Persistent:** Remembers open tabs, sidebar width, added projects, and window size/position across sessions.
- **"IDE without the Code Editor":** Designed for developers who need a robust terminal environment for multiple repositories.

## Key Features

- **Integrated Terminal:** Full-featured terminal using `xterm.js` and `node-pty`.
- **Project Manager:** Collapsible sidebar to manage and switch between project directories.
- **Smart Detection:** Automatically assigns icons to projects based on tech stack (React, Python, Node, etc.).
- **Multi-Tab Interface:** Independent terminal sessions for different tasks.
- **Admin Mode:** Support for relaunching with elevated privileges.
- **Auto-Update:** Built-in update mechanism.

## Future Roadmap (v1.7.0+)

- **Terminal Persistence:** Integrate `xterm-addon-serialize` to restore terminal buffers across sessions.
- **Actionable Project Scripts:** A dedicated panel to run detected `package.json` or Makefile scripts with one click.
- **Git Status Badges:** Display branch names and "dirty" status indicators in the sidebar.
- **Split Panes:** Support for horizontal/vertical terminal splits within a single tab.
- **Enhanced Smart Detection:** Support for Go, Rust (Cargo), Docker, and more.
- **Integrated Search UI:** A polished, dedicated UI for searching within terminal buffers.
