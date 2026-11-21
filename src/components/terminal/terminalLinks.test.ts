import { describe, expect, it, vi } from 'vitest';
import type { ILink, ILinkProvider, Terminal } from 'xterm';
import type { ElectronAPI } from '../../types';
import { registerTerminalLinks } from './terminalLinks';

function linkProvider(rows: string[]) {
  let provider: ILinkProvider;
  const terminal = {
    cols: 80,
    buffer: {
      active: {
        length: rows.length,
        getLine: (index: number) =>
          rows[index] === undefined
            ? undefined
            : {
                isWrapped: index > 0,
                translateToString: () => rows[index],
              },
      },
    },
    registerLinkProvider: (value: ILinkProvider) => {
      provider = value;
      return { dispose: vi.fn() };
    },
  } as unknown as Terminal;
  let cwd = 'C:\\project';
  registerTerminalLinks(terminal, () => cwd);
  return {
    inspect(line: number) {
      let links: ILink[] | undefined;
      provider.provideLinks(line, (result) => {
        links = result;
      });
      return links;
    },
    setCwd(value: string) {
      cwd = value;
    },
  };
}

describe('terminal link provider', () => {
  it('resolves relative links against the latest CWD without inspection IPC', () => {
    window.electron = { getProjectInfo: vi.fn(), openLocalPath: vi.fn() } as unknown as ElectronAPI;
    const provider = linkProvider(['src/App.tsx']);
    expect(provider.inspect(1)?.[0].text).toBe('C:\\project\\src\\App.tsx');
    provider.setCwd('/next');
    const link = provider.inspect(1)?.[0];
    expect(link?.text).toBe('/next/src/App.tsx');
    link?.activate(new MouseEvent('click'), link.text);
    expect(window.electron.openLocalPath).toHaveBeenCalledWith('/next/src/App.tsx');
    expect(window.electron.getProjectInfo).not.toHaveBeenCalled();
  });

  it('keeps wrapped URL segments clickable and avoids duplicate relative matches', () => {
    const provider = linkProvider(['https://example.com/', 'file.ts']);
    const first = provider.inspect(1);
    const second = provider.inspect(2);
    expect(first).toHaveLength(1);
    expect(second).toHaveLength(1);
    expect(second?.[0].text).toBe('https://example.com/file.ts');
    expect(second?.[0].range).toEqual({ start: { x: 1, y: 2 }, end: { x: 7, y: 2 } });
  });
});
