# Specification: v1.9.0 File Operations & Universal Shortcuts

## 1. File Explorer CRUD Operations
The File Explorer currently only allows browsing and opening folders in new terminals. We will add full file management capabilities.

### Backend Requirements
- **`createFile(path)`**: Create an empty file at the specified path.
- **`createDirectory(path)`**: Create a new directory.
- **`renameItem(oldPath, newPath)`**: Rename a file or folder.
- **`deleteItem(path)`**: Move a file or folder to the trash (using Electron's `shell.trashItem`).
- **`openInExplorer(path)`**: Open the containing folder in the OS file manager.

### Frontend Requirements
- **Context Menu**: Add a right-click menu to items in the `FileExplorer`.
- **Inline Renaming**: When "Rename" is selected, the item name should become an editable input.
- **New Item UI**: Buttons or menu options to trigger file/folder creation in the current directory.

## 2. Universal Shortcut Compatibility
To ensure CmdGUI doesn't interfere with complex CLI tools (e.g., `vim`, `htop`, `git` interactive modes), we will migrate app-level shortcuts away from common control codes.

### Keybinding Changes
- **Find**: `Ctrl + F` -> `Ctrl + Shift + F`.
- **Clear Terminal**: `Ctrl + L` -> `Ctrl + Shift + L`.
- **New Line**: `Ctrl + Enter` -> `Shift + Enter`.
- **Copy/Paste**: Already standard `Ctrl + Shift + C/V`.

### Terminal Event Handling
- The terminal's `attachCustomKeyEventHandler` will be updated to ensure that all `Ctrl + [Key]` combinations (without Shift) are passed directly to the shell.
- The `isKeyMatch` logic will be verified to prevent false positives that might block terminal input.

## Acceptance Criteria
- [ ] Users can create, rename, and delete files/folders from the sidebar.
- [ ] `Ctrl + L` correctly clears the shell screen without triggering app-level logic.
- [ ] `Ctrl + F` is ignored by the app, allowing it to be used by CLI tools if needed.
- [ ] `Ctrl + Shift + F` successfully opens the app's internal search.
