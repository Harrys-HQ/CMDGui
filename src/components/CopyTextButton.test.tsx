import React, { useRef } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import CopyTextButton from './CopyTextButton';
import { copyText } from '../utils/clipboard';

vi.mock('../utils/clipboard', () => ({ copyText: vi.fn() }));

function Content() {
  const ref = useRef<HTMLDivElement>(null);
  return (
    <div ref={ref}>
      <p>Only chosen words</p>
      <CopyTextButton text="Full output" selectionRoot={ref} onError={vi.fn()} />
    </div>
  );
}

beforeEach(() => {
  vi.mocked(copyText).mockResolvedValue(undefined);
});
afterEach(() => {
  vi.clearAllMocks();
  window.getSelection()?.removeAllRanges();
});

describe('Copy text', () => {
  it('copies exactly the highlighted portion and keeps the highlight', async () => {
    render(<Content />);
    const range = document.createRange();
    const text = screen.getByText('Only chosen words').firstChild!;
    range.setStart(text, 5);
    range.setEnd(text, 11);
    window.getSelection()!.addRange(range);
    fireEvent.click(screen.getByRole('button', { name: 'Copy' }));
    await waitFor(() => expect(copyText).toHaveBeenCalledWith('chosen'));
    expect(window.getSelection()!.toString()).toBe('chosen');
  });

  it('copies the complete supplied content when nothing is selected', async () => {
    render(<Content />);
    fireEvent.click(screen.getByRole('button', { name: 'Copy' }));
    await waitFor(() => expect(copyText).toHaveBeenCalledWith('Full output'));
  });
});
