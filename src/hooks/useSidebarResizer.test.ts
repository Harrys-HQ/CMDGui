import { renderHook, act } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { useSidebarResizer } from './useSidebarResizer';

// Mock persistence
vi.mock('./usePersistence', () => ({
  loadState: vi.fn((key, defaultVal) => defaultVal),
  saveState: vi.fn(),
}));

describe('useSidebarResizer Hook', () => {
  it('should initialize with default width', () => {
    const { result } = renderHook(() => useSidebarResizer());
    expect(result.current.sidebarWidth).toBe(250);
  });

  it('should start resizing', () => {
    const { result } = renderHook(() => useSidebarResizer());
    
    act(() => {
      result.current.startResizing();
    });

    expect(result.current.isResizing).toBe(true);
  });

  it('should resize when mouse moves while resizing', () => {
    const { result } = renderHook(() => useSidebarResizer());
    
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

  it('should NOT resize when mouse moves if NOT resizing', () => {
    const { result } = renderHook(() => useSidebarResizer());
    
    // No startResizing call

    act(() => {
      const event = new MouseEvent('mousemove', { clientX: 300 });
      window.dispatchEvent(event);
    });

    expect(result.current.sidebarWidth).toBe(250); // Stays default
  });

  it('should stop resizing on mouseup', () => {
     const { result } = renderHook(() => useSidebarResizer());
    
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
