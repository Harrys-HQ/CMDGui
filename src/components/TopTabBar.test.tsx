import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { expect, it, vi } from 'vitest';
import type { Tab } from '../types';
import TopTabBar from './TopTabBar';

it('allows keyboard selection, closing, and opening with visible focus on a neighboring tab', async () => {
  const user = userEvent.setup();
  const props = {
    tabs: [
      { id: 'one', title: 'PowerShell' },
      { id: 'two', title: 'Bash' },
    ] as Tab[],
    activeTabId: 'one',
    onSelectTab: vi.fn(),
    onCloseTab: vi.fn(),
    onRenameTab: vi.fn(),
    onReorderTabs: vi.fn(),
    onAddTab: vi.fn(),
  };
  render(<TopTabBar {...props} />);
  const bash = screen.getByRole('button', { name: 'Bash' });
  bash.focus();
  await user.keyboard(' ');
  expect(props.onSelectTab).toHaveBeenCalledWith('two');
  await user.tab();
  expect(screen.getByRole('button', { name: 'Close Bash' })).toHaveFocus();
  await user.keyboard('{Enter}');
  expect(props.onCloseTab).toHaveBeenCalledWith('two', expect.anything());
  expect(screen.getByRole('button', { name: 'PowerShell' })).toHaveFocus();
  await user.tab();
  await user.tab();
  await user.tab();
  await user.tab();
  expect(screen.getByRole('button', { name: 'New terminal tab' })).toHaveFocus();
  await user.keyboard('{Enter}');
  expect(props.onAddTab).toHaveBeenCalledOnce();
});
