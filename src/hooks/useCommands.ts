import { useMemo } from 'react';
import { Keymap, formatKeybinding } from './useKeybindings';
import { Workspace } from '../types';

export interface Command {
  id: string;
  name: string;
  category: string;
  icon: string;
  shortcut?: string;
  action: () => void;
}

interface UseCommandsProps {
  onAddTerminal: (asAdmin: boolean) => void;
  onCloseTab: (id: string) => void;
  onRenameTab: (id: string) => void;
  onClearTerminal: () => void;
  onOpenSettings: () => void;
  onCheckUpdates: () => void;
  onToggleTheme: () => void;
  onSaveWorkspace: (name: string) => void;
  onLoadWorkspace: (id: string) => void;
  workspaces: Workspace[];
  activeTabId: string | null;
  keymap: Keymap;
}

export const useCommands = ({
  onAddTerminal,
  onCloseTab,
  onRenameTab,
  onClearTerminal,
  onOpenSettings,
  onCheckUpdates,
  onToggleTheme,
  onSaveWorkspace,
  onLoadWorkspace,
  workspaces,
  activeTabId,
  keymap,
}: UseCommandsProps) => {
  const commands: Command[] = useMemo(() => {
    const list: Command[] = [
      {
        id: 'save-workspace',
        name: 'Save Current Workspace',
        category: 'Workspace',
        icon: '💾',
        action: () => {
          const name = prompt('Workspace Name:');
          if (name) onSaveWorkspace(name);
        },
      },
      ...workspaces.map(w => ({
        id: `load-workspace-${w.id}`,
        name: `Load Workspace: ${w.name}`,
        category: 'Workspace',
        icon: '📂',
        action: () => onLoadWorkspace(w.id),
      })),
      {
        id: 'new-terminal',
        name: 'New Terminal',
        category: 'Terminal',
        icon: '➕',
        shortcut: formatKeybinding(keymap.newTab),
        action: () => onAddTerminal(false),
      },
      {
        id: 'new-terminal-admin',
        name: 'New Terminal (Admin)',
        category: 'Terminal',
        icon: '🛡️',
        action: () => onAddTerminal(true),
      },
      {
        id: 'toggle-theme',
        name: 'Toggle Theme',
        category: 'App',
        icon: '🎨',
        action: onToggleTheme,
      },
      {
        id: 'settings',
        name: 'Settings',
        category: 'App',
        icon: '⚙️',
        action: onOpenSettings,
      },
      {
        id: 'check-updates',
        name: 'Check for Updates',
        category: 'App',
        icon: '✨',
        action: onCheckUpdates,
      },
    ];

    if (activeTabId) {
      list.push(
        {
          id: 'clear-terminal',
          name: 'Clear Terminal',
          category: 'Terminal',
          icon: '🧹',
          shortcut: formatKeybinding(keymap.clearTerminal),
          action: onClearTerminal,
        },
        {
          id: 'rename-task',
          name: 'Rename Current Task',
          category: 'Terminal',
          icon: '✏️',
          action: () => onRenameTab(activeTabId),
        },
        {
          id: 'close-task',
          name: 'Close Current Task',
          category: 'Terminal',
          icon: '❌',
          shortcut: formatKeybinding(keymap.closeTab),
          action: () => onCloseTab(activeTabId),
        }
      );
    }

    return list;
  }, [
    onAddTerminal,
    onCloseTab,
    onRenameTab,
    onClearTerminal,
    onOpenSettings,
    onCheckUpdates,
    onToggleTheme,
    onSaveWorkspace,
    onLoadWorkspace,
    workspaces,
    activeTabId,
    keymap,
  ]);

  return { commands };
};
