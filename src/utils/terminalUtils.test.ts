import { describe, it, expect } from 'vitest';
import {
  cleanTerminalTitle,
  extractTerminalLinks,
  sanitizeLinkTarget,
} from './terminalUtils';

describe('terminalUtils - link extraction', () => {
  it('extracts Markdown links with target URLs', () => {
    const text = 'Check [Redesign Mockup](file:///C:/Users/HarrysHQ/mockup.md) for details';
    const links = extractTerminalLinks(text);
    expect(links).toHaveLength(1);
    expect(links[0].type).toBe('markdown');
    expect(links[0].text).toBe('[Redesign Mockup](file:///C:/Users/HarrysHQ/mockup.md)');
    expect(links[0].target).toBe('file:///C:/Users/HarrysHQ/mockup.md');
  });

  it('extracts Markdown image links with leading slashes', () => {
    const text = '![Dashboard](/C:/Users/HarrysHQ/nav.jpg)';
    const links = extractTerminalLinks(text);
    expect(links).toHaveLength(1);
    expect(links[0].type).toBe('markdown');
    expect(links[0].target).toBe('/C:/Users/HarrysHQ/nav.jpg');
  });

  it('extracts standard HTTP/HTTPS URLs', () => {
    const text = 'Login at https://accounts.google.com/oauth?client_id=123&redirect_uri=http://localhost:8080 and proceed.';
    const links = extractTerminalLinks(text);
    expect(links).toHaveLength(1);
    expect(links[0].type).toBe('url');
    expect(links[0].target).toBe('https://accounts.google.com/oauth?client_id=123&redirect_uri=http://localhost:8080');
  });

  it('extracts tilde (~) home paths', () => {
    const text = 'Saved to ~/.gemini/antigravity-cli/brain/123/notes.md for later.';
    const links = extractTerminalLinks(text);
    expect(links).toHaveLength(1);
    expect(links[0].type).toBe('tilde');
    expect(links[0].target).toBe('~/.gemini/antigravity-cli/brain/123/notes.md');
  });

  it('extracts Windows paths with backslashes and forward slashes', () => {
    const text = 'Config at C:\\Users\\HarrysHQ\\settings.json and D:/Data/file.txt';
    const links = extractTerminalLinks(text);
    expect(links).toHaveLength(2);
    expect(links[0].type).toBe('winpath');
    expect(links[0].target).toBe('C:\\Users\\HarrysHQ\\settings.json');
    expect(links[1].type).toBe('winpath');
    expect(links[1].target).toBe('D:/Data/file.txt');
  });

  it('does not duplicate inner URLs covered by Markdown links', () => {
    const text = 'See [Docs](https://example.com/docs) and raw https://example.com/other';
    const links = extractTerminalLinks(text);
    expect(links).toHaveLength(2);
    expect(links[0].type).toBe('markdown');
    expect(links[0].target).toBe('https://example.com/docs');
    expect(links[1].type).toBe('url');
    expect(links[1].target).toBe('https://example.com/other');
  });
});

describe('terminalUtils - sanitizeLinkTarget', () => {
  it('identifies external web URLs', () => {
    const res = sanitizeLinkTarget('https://github.com/Harrys-HQ/CMDGui');
    expect(res).toEqual({ type: 'external', path: 'https://github.com/Harrys-HQ/CMDGui' });
  });

  it('sanitizes file:/// URIs into Windows local paths', () => {
    const res = sanitizeLinkTarget('file:///C:/Users/HarrysHQ/Documents/test%20file.md');
    expect(res).toEqual({ type: 'local', path: 'C:\\Users\\HarrysHQ\\Documents\\test file.md' });
  });

  it('strips leading slash from Windows drive paths', () => {
    const res = sanitizeLinkTarget('/C:/Users/HarrysHQ/nav.jpg');
    expect(res).toEqual({ type: 'local', path: 'C:\\Users\\HarrysHQ\\nav.jpg' });
  });

  it('preserves tilde paths for shell expansion', () => {
    const res = sanitizeLinkTarget('~/.gemini/antigravity-cli/config.json');
    expect(res).toEqual({ type: 'local', path: '~/.gemini/antigravity-cli/config.json' });
  });
});

describe('terminalUtils - cleanTerminalTitle', () => {
  it('strips Administrator prefix', () => {
    expect(cleanTerminalTitle('Administrator: cmd.exe', undefined, false)).toBe('cmd.exe');
  });

  it('extracts basename for paths', () => {
    expect(cleanTerminalTitle('C:\\Users\\HarrysHQ\\Projects\\CMDGui', undefined, false)).toBe('CMDGui');
  });
});
