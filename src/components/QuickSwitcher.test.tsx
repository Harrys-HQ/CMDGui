import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import QuickSwitcher from '../components/QuickSwitcher';
import React from 'react';

describe('QuickSwitcher Component', () => {
  const mockProps = {
    isOpen: true,
    onClose: vi.fn(),
    tabs: [
      {
        id: 'tab-1',
        title: 'Frontend Task',
        isManualTitle: false,
        layout: { type: 'terminal' as const, paneId: 'pane-1' },
        panes: { 'pane-1': { id: 'pane-1', cwd: '/' } },
      },
    ],
    projects: [{ name: 'My Project', path: '/path/to/project', icon: '📂' }],
    commands: [
      { id: 'cmd-1', name: 'Clear Terminal', category: 'Terminal', icon: '🧹', action: vi.fn() },
      { id: 'cmd-2', name: 'New Terminal', category: 'Terminal', icon: '➕', action: vi.fn() },
    ],
    onSelectTab: vi.fn(),
    onSelectProject: vi.fn(),
  };

  it('renders search results by default (Search Mode)', () => {
    render(<QuickSwitcher {...mockProps} />);

    expect(screen.getByPlaceholderText(/Search tabs/)).toBeDefined();
    expect(screen.getByText('Frontend Task')).toBeDefined();
    expect(screen.getByText('My Project')).toBeDefined();

    // Commands should NOT be visible by default
    expect(screen.queryByText('Clear Terminal')).toBeNull();
  });

  it('switches to Command Mode when ">" is typed', async () => {
    render(<QuickSwitcher {...mockProps} />);
    const input = screen.getByPlaceholderText(/Search tabs/);

    fireEvent.change(input, { target: { value: '>' } });

    // Now commands should be visible
    expect(screen.getByText('Clear Terminal')).toBeDefined();
    expect(screen.getByText('New Terminal')).toBeDefined();

    // Tabs and Projects should be hidden
    expect(screen.queryByText('Frontend Task')).toBeNull();
  });

  it('filters commands in Command Mode', () => {
    render(<QuickSwitcher {...mockProps} />);
    const input = screen.getByPlaceholderText(/Search tabs/);

    fireEvent.change(input, { target: { value: '>clear' } });

    expect(screen.getByText('Clear Terminal')).toBeDefined();
    expect(screen.queryByText('New Terminal')).toBeNull();
  });

  it('executes command action on Enter', () => {
    render(<QuickSwitcher {...mockProps} />);
    const input = screen.getByPlaceholderText(/Search tabs/);

    fireEvent.change(input, { target: { value: '>clear' } });
    fireEvent.keyDown(input, { key: 'Enter' });

    expect(mockProps.commands[0].action).toHaveBeenCalled();
    expect(mockProps.onClose).toHaveBeenCalled();
  });
});
