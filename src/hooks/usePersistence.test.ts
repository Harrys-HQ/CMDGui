import { afterEach, expect, it, vi } from 'vitest';
import type { ElectronAPI } from '../types';
import { loadState, saveState } from './usePersistence';

afterEach(() => {
  vi.useRealTimers();
});

it('loads same-tick settings in one request and retains defaults for missing keys', async () => {
  const settingsGetMany = vi.fn().mockResolvedValue({ theme: 'light' });
  window.electron = { settingsGetMany } as unknown as ElectronAPI;

  await expect(
    Promise.all([loadState('theme', 'dark'), loadState('fontSize', 14), loadState('theme', 'dark')])
  ).resolves.toEqual(['light', 14, 'light']);
  expect(settingsGetMany).toHaveBeenCalledExactlyOnceWith(['theme', 'fontSize']);
});

it('merges rapid saves and retains a newer update that arrives during a write', async () => {
  vi.useFakeTimers();
  let finishFirstWrite!: () => void;
  const settingsSetMany = vi
    .fn()
    .mockImplementationOnce(
      () =>
        new Promise<void>((resolve) => {
          finishFirstWrite = resolve;
        })
    )
    .mockResolvedValue(undefined);
  window.electron = { settingsSetMany } as unknown as ElectronAPI;

  const first = saveState('theme', 'dark');
  const second = saveState('fontSize', 16);
  await vi.advanceTimersByTimeAsync(500);
  expect(settingsSetMany).toHaveBeenCalledExactlyOnceWith({ theme: 'dark', fontSize: 16 });

  const newer = saveState('theme', 'light');
  await vi.advanceTimersByTimeAsync(500);
  expect(settingsSetMany).toHaveBeenCalledTimes(1);
  finishFirstWrite();
  await Promise.all([first, second, newer]);
  expect(settingsSetMany).toHaveBeenNthCalledWith(2, { theme: 'light' });
});
