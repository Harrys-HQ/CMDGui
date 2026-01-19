# CmdGUI

CmdGUI is a React + Electron application designed to provide a workspace environment for managing and interacting with your command line projects. It features a multi-tabbed terminal interface and a built-in documentation viewer.

## Features

- **Multi-Tab Terminal:** Run multiple terminal sessions (PowerShell/Bash) simultaneously.
- **Integrated Documentation:** View documentation and usage directly within the app.

## Getting Started

### Prerequisites

- Node.js (v16 or higher recommended)
- npm

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

The application provides a "Settings & Docs" modal that lists all available Gemini CLI commands. Here is a quick reference:

### Slash Commands (/)

| Command | Description |
| :--- | :--- |
| `/bug` | Report an issue about Gemini CLI. |
| `/chat` | Save, resume, list, delete, or share conversation history. |
| `/clear` | Clear the terminal screen. |
| `/compress` | Summarize chat context to save tokens. |
| `/copy` | Copy the last output to the clipboard. |
| `/dir` | Manage workspace directories (`add`, `show`). |
| `/help` | Display help information. |
| `/init` | Analyze directory and generate a `GEMINI.md` context file. |
| `/mcp` | Manage Model Context Protocol servers (`list`, `auth`, `refresh`). |
| `/memory` | Manage instructional context (`add`, `show`, `refresh`). |
| `/model` | Select your Gemini model. |
| `/restore` | Restore project files to a previous state. |
| `/rewind` | Rewind conversation and revert file changes. |
| `/settings` | Open the settings editor. |
| `/skills` | Manage agent skills (`list`, `enable`, `disable`). |
| `/stats` | Display session statistics. |
| `/tools` | List available tools. |
| `/quit` | Exit Gemini CLI. |

### At Commands (@)

| Command | Description |
| :--- | :--- |
| `@<path>` | Inject the content of a file or directory into the prompt. |
| `@` | Pass the query as-is to the model without context management. |

### Shell Mode (!)

| Command | Description |
| :--- | :--- |
| `!<command>` | Execute a shell command (e.g., `!git status`). |
| `!` | Toggle persistent shell mode. |

## License

ISC
