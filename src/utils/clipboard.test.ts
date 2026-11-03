import { afterEach, describe, expect, it, vi } from 'vitest';
import { copyText } from './clipboard';

const original = Object.getOwnPropertyDescriptor(window, 'electron');
afterEach(() => {
  if (original) Object.defineProperty(window, 'electron', original);
  else Reflect.deleteProperty(window, 'electron');
});

describe('native clipboard', () => {
  it('writes the exact selected Unicode text through the native bridge', async () => {
    const writeClipboard = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(window, 'electron', { configurable: true, value: { writeClipboard } });
    await copyText('Selected 中文\nsecond line');
    expect(writeClipboard).toHaveBeenCalledWith('Selected 中文\nsecond line');
  });

  it('reports failures instead of pretending the copy succeeded', async () => {
    Object.defineProperty(window, 'electron', {
      configurable: true,
      value: { writeClipboard: vi.fn().mockRejectedValue(new Error('Clipboard busy')) },
    });
    await expect(copyText('chosen')).rejects.toThrow('Clipboard busy');
  });
});
