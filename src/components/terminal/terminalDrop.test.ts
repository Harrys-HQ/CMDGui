import { afterEach, expect, it, vi } from 'vitest';
import { createTerminalDropHandler } from './terminalDrop';

const textDrop = (plain: string, uri = '', types = ['text/plain']) => ({
  types,
  files: [] as unknown as FileList,
  getData: (format: string) => (format === 'text/uri-list' ? uri : plain),
});

afterEach(() => vi.useRealTimers());

it.each([true, false])(
  'pastes a file once when both channels deliver it (DOM first: %s)',
  (domFirst) => {
    vi.useFakeTimers();
    const paste = vi.fn();
    const drop = createTerminalDropHandler(paste);
    const path = 'C:\\Example Folder\\report.txt';
    const data = textDrop('file:///C:/Example%20Folder/report.txt');
    if (domFirst) drop.text(data);
    drop.file([path]);
    if (!domFirst) drop.text(data);
    vi.runAllTimers();
    expect(paste).toHaveBeenCalledExactlyOnceWith('"C:\\Example Folder\\report.txt" ');
  }
);

it('handles repeated native drops and multiple selected files', () => {
  const paste = vi.fn();
  const drop = createTerminalDropHandler(paste);
  const paths = ['C:\\one.txt', 'C:\\two.txt', 'C:\\one.txt'];
  drop.text(textDrop('C:\\one.txt', '', ['Files', 'text/plain']));
  drop.file(paths);
  drop.file(paths);
  expect(paste.mock.calls).toEqual([['C:\\one.txt C:\\two.txt '], ['C:\\one.txt C:\\two.txt ']]);
});

it('pastes web links immediately and retains standalone plain-text path drops', () => {
  vi.useFakeTimers();
  const paste = vi.fn();
  const drop = createTerminalDropHandler(paste);
  drop.text(textDrop('https://example.com'));
  expect(paste).toHaveBeenCalledExactlyOnceWith('https://example.com');
  drop.text(textDrop('C:\\standalone.txt'));
  vi.runAllTimers();
  expect(paste).toHaveBeenLastCalledWith('C:\\standalone.txt');
});
