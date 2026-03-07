import { renderHook, act, waitFor } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { useSidebarResizer } from './useSidebarResizer';

// Mock persistence
vi.mock('./usePersistence', () => ({
  loadState: vi.fn((key, defaultVal) => Promise.resolve(defaultVal)),
  saveState: vi.fn(),
}));

describe('useSidebarResizer Hook', () => {
  it('should initialize with default width', async () => {
    const { result } = renderHook(() => useSidebarResizer());
    await waitFor(() => expect(result.current.sidebarWidth).toBe(250));
  });

  it('should start resizing', async () => {
    const { result } = renderHook(() => useSidebarResizer());
    await waitFor(() => expect(result.current.sidebarWidth).toBe(250));

    act(() => {
      result.current.startResizing();
    });

    expect(result.current.isResizing).toBe(true);
  });

  it('should resize when mouse moves while resizing', async () => {
    const { result } = renderHook(() => useSidebarResizer());
    await waitFor(() => expect(result.current.sidebarWidth).toBe(250));

    act(() => {
      result.current.startResizing();
    });

    // Simulate mouse move
    act(() => {
      const event = new MouseEvent('mousemove', { clientX: 300 });
      window.dispatchEvent(event);
    });

    expect(result.current.sidebarWidth).toBe(300);
  });

  it('should NOT resize when mouse moves if NOT resizing', async () => {
    const { result } = renderHook(() => useSidebarResizer());
    await waitFor(() => expect(result.current.sidebarWidth).toBe(250));

    // No startResizing call

    act(() => {
      const event = new MouseEvent('mousemove', { clientX: 300 });
      window.dispatchEvent(event);
    });

    expect(result.current.sidebarWidth).toBe(250); // Stays default
  });

  it('should stop resizing on mouseup', async () => {
    const { result } = renderHook(() => useSidebarResizer());
    await waitFor(() => expect(result.current.sidebarWidth).toBe(250));

    act(() => {
      result.current.startResizing();
    });
    expect(result.current.isResizing).toBe(true);

    act(() => {
      const event = new MouseEvent('mouseup');
      window.dispatchEvent(event);
    });

    expect(result.current.isResizing).toBe(false);
  });
});
