import { act, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import ContextMenu from './ContextMenu';
import { closeContextMenu, openContextMenu } from '../utils/contextMenu';

afterEach(() => {
  act(() => closeContextMenu());
});

describe('context menu lifecycle', () => {
  it('supports keyboard navigation and restores focus on escape', () => {
    render(
      <>
        <button>Origin</button>
        <ContextMenu />
      </>
    );
    const origin = screen.getByText('Origin');
    origin.focus();
    act(() =>
      openContextMenu([{ label: 'Copy' }, { isSeparator: true }, { label: 'Paste' }], {
        x: 20,
        y: 30,
      })
    );
    expect(document.activeElement).toBe(screen.getByText('Copy'));
    fireEvent.keyDown(document, { key: 'ArrowDown' });
    expect(document.activeElement).toBe(screen.getByText('Paste'));
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(screen.queryByRole('menu')).toBeNull();
    expect(document.activeElement).toBe(origin);
  });

  it('closes on selection or outside click and runs each action once', () => {
    const callback = vi.fn();
    render(<ContextMenu />);
    act(() => openContextMenu([{ label: 'Action', callback }], { x: 0, y: 0 }));
    fireEvent.click(screen.getByRole('menuitem'));
    expect(callback).toHaveBeenCalledTimes(1);
    expect(screen.queryByRole('menu')).toBeNull();
    act(() => openContextMenu([{ label: 'Action', callback }], { x: 0, y: 0 }));
    fireEvent.mouseDown(document.body);
    expect(screen.queryByRole('menu')).toBeNull();
    expect(callback).toHaveBeenCalledTimes(1);
  });
});
