import { useMemo } from 'react';
import { Keymap, formatKeybinding } from './useKeybindings';
import { Workspace } from '../types';
import { SidebarView } from '../components/ActivityBar';

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
  onSetUiTheme: (theme: string) => void;
  onToggleSidebar: () => void;
  onSetSidebarView: (view: SidebarView) => void;
  onSaveWorkspace: (name: string) => void;
  onLoadWorkspace: (id: string) => void;
  onRefreshDisplay: () => void;
  onOpenAiAssistant?: () => void;
  onToggleYoloMode?: () => void;
  onToggleStayAwake?: () => void;
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
  onSetUiTheme,
  onToggleSidebar,
  onSetSidebarView,
  onSaveWorkspace,
  onLoadWorkspace,
  onRefreshDisplay,
  onOpenAiAssistant,
  onToggleYoloMode,
  onToggleStayAwake,
  workspaces,
  activeTabId,
  keymap,
}: UseCommandsProps) => {
  const commands: Command[] = useMemo(() => {
    const list: Command[] = [
      {
        id: 'open-ai-assistant',
        name: 'AI: Open Command & Workflow Center',
        category: 'AI & Coding',
        icon: '✨',
        shortcut: 'Ctrl+K',
        action: () => onOpenAiAssistant && onOpenAiAssistant(),
      },
      {
        id: 'toggle-yolo-mode',
        name: 'AI: Toggle YOLO Mode (Auto-Approve Confirmations)',
        category: 'AI & Coding',
        icon: '⚡',
        action: () => onToggleYoloMode && onToggleYoloMode(),
      },
      {
        id: 'toggle-stay-awake',
        name: 'System: Toggle Stay Awake (Prevent Lock/Sleep)',
        category: 'System',
        icon: '☕',
        action: () => onToggleStayAwake && onToggleStayAwake(),
      },
      {
        id: 'refresh-display',
        name: 'Repair / Refresh Display (Fix Visual Glitches)',
        category: 'Display',
        icon: '🖥️',
        shortcut: formatKeybinding(keymap.refreshDisplay),
        action: onRefreshDisplay,
      },
      {
        id: 'toggle-sidebar',
        name: 'Toggle Sidebar',
        category: 'UI',
        icon: '🪜',
        shortcut: formatKeybinding(keymap.toggleSidebar),
        action: onToggleSidebar,
      },
      {
        id: 'show-explorer',
        name: 'Show Explorer',
        category: 'UI',
        icon: '📁',
        action: () => onSetSidebarView('explorer'),
      },
      {
        id: 'show-git',
        name: 'Show Source Control',
        category: 'UI',
        icon: '🌿',
        action: () => onSetSidebarView('git'),
      },
      {
        id: 'show-ports',
        name: 'Show Active Ports & Kill Processes',
        category: 'UI',
        icon: '🔌',
        action: () => onSetSidebarView('ports'),
      },
      {
        id: 'theme-dark',
        name: 'Use Theme: VS Code Dark',
        category: 'Appearance',
        icon: '🌙',
        action: () => onSetUiTheme('dark'),
      },
      {
        id: 'theme-light',
        name: 'Use Theme: Light',
        category: 'Appearance',
        icon: '☀️',
        action: () => onSetUiTheme('light'),
      },
      {
        id: 'theme-amoled',
        name: 'Use Theme: Amoled Black',
        category: 'Appearance',
        icon: '🌑',
        action: () => onSetUiTheme('amoled'),
      },
      {
        id: 'theme-nord',
        name: 'Use Theme: Nord Frost',
        category: 'Appearance',
        icon: '❄️',
        action: () => onSetUiTheme('nord'),
      },
      {
        id: 'theme-tokyonight',
        name: 'Use Theme: Tokyo Night',
        category: 'Appearance',
        icon: '🌸',
        action: () => onSetUiTheme('tokyonight'),
      },
      {
        id: 'theme-cyberpunk',
        name: 'Use Theme: Cyberpunk Neon',
        category: 'Appearance',
        icon: '🌆',
        action: () => onSetUiTheme('cyberpunk'),
      },
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
      ...(workspaces || [])
        .filter((w) => w && typeof w === 'object' && w.id && w.name)
        .map((w) => ({
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
        shortcut: formatKeybinding(keymap.newAdminTab),
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
    onSetSidebarView,
    onSetUiTheme,
    onToggleSidebar,
    onRefreshDisplay,
    onOpenAiAssistant,
    onToggleYoloMode,
    onToggleStayAwake,
    workspaces,
    activeTabId,
    keymap,
  ]);

  return { commands };
};
