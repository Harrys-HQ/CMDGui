import type { Terminal, ILink } from 'xterm';
import { extractTerminalLinks, sanitizeLinkTarget } from '../../utils/terminalUtils';

type Candidate = { start: number; end: number; target: string; relative?: boolean };

export function registerTerminalLinks(term: Terminal, getCwd: () => string) {
  // Cache repeated viewport inspections without keeping unbounded scrollback text.
  const cache = new Map<string, Candidate[]>();
  const candidatesFor = (text: string) => {
    const cached = cache.get(text);
    if (cached) return cached;
    const candidates: Candidate[] = extractTerminalLinks(text);
    const relativePath =
      /(?:[a-zA-Z0-9_.\-/\\]+)\.(?:exe|msi|bat|cmd|ps1|tsx|ts|jsx|js|json|md|txt|log|png|jpg|css|html)/gi;
    for (const match of text.matchAll(relativePath)) {
      const start = match.index;
      const target = match[0].replace(/[)\].,;:]+$/, '');
      if (candidates.some((item) => start < item.end && start + target.length > item.start))
        continue;
      if (/^[a-zA-Z]:[/\\]/.test(target) || target.startsWith('~')) continue;
      candidates.push({ start, end: start + target.length, target, relative: true });
    }
    if (cache.size >= 256) cache.delete(cache.keys().next().value!);
    cache.set(text, candidates);
    return candidates;
  };
  // Helper to get full wrapped line range and text around bufferLineNumber
  // Helper to get full wrapped line range and text around bufferLineNumber
  const getWrappedLineText = (lineNum: number) => {
    const buffer = term.buffer.active;
    let startLineIdx = lineNum - 1;

    // In xterm.js, line.isWrapped is TRUE on line N if line N is a continuation of line N-1.
    while (startLineIdx > 0 && buffer.getLine(startLineIdx)?.isWrapped) {
      startLineIdx--;
    }

    let endLineIdx = lineNum - 1;
    while (endLineIdx + 1 < buffer.length && buffer.getLine(endLineIdx + 1)?.isWrapped) {
      endLineIdx++;
    }

    let fullText = '';
    const lineOffsets: { lineIdx: number; startChar: number; length: number }[] = [];
    for (let i = startLineIdx; i <= endLineIdx; i++) {
      const l = buffer.getLine(i);
      if (l) {
        // translateToString(true) trims trailing whitespace from each terminal row
        const text = l.translateToString(true).replace(/[\r\n]+/g, '');
        lineOffsets.push({ lineIdx: i, startChar: fullText.length, length: text.length });
        fullText += text;
      }
    }

    return { startLineIdx, endLineIdx, fullText, lineOffsets };
  };

  // Convert character offset in fullText to { x, y } xterm 1-indexed coordinates
  const getCharPosition = (
    charIdx: number,
    lineOffsets: { lineIdx: number; startChar: number; length: number }[]
  ) => {
    for (let i = 0; i < lineOffsets.length; i++) {
      const line = lineOffsets[i];
      const nextStart = i + 1 < lineOffsets.length ? lineOffsets[i + 1].startChar : Infinity;
      if (charIdx >= line.startChar && charIdx < nextStart) {
        const localCol = charIdx - line.startChar;
        return { x: localCol + 1, y: line.lineIdx + 1 };
      }
    }
    const last = lineOffsets[lineOffsets.length - 1];
    return { x: last.length + 1, y: last.lineIdx + 1 };
  };

  return term.registerLinkProvider({
    provideLinks(bufferLineNumber, callback) {
      const { fullText, lineOffsets } = getWrappedLineText(bufferLineNumber);
      if (!lineOffsets.length) {
        callback(undefined);
        return;
      }
      const links: ILink[] = [];
      const cwd = getCwd();
      for (const item of candidatesFor(fullText)) {
        if (item.relative && !cwd) continue;
        const start = getCharPosition(item.start, lineOffsets);
        const end = getCharPosition(item.end - 1, lineOffsets);
        if (bufferLineNumber < start.y || bufferLineNumber > end.y) continue;
        const separator = cwd.includes('/') ? '/' : '\\';
        const target = item.relative
          ? `${cwd}${separator}${item.target.replace(/[/\\]/g, separator)}`
          : item.target;
        links.push({
          text: target,
          range: {
            start: { x: bufferLineNumber === start.y ? start.x : 1, y: bufferLineNumber },
            end: { x: bufferLineNumber === end.y ? end.x : term.cols, y: bufferLineNumber },
          },
          activate() {
            const sanitized = sanitizeLinkTarget(target);
            if (sanitized.type === 'external') void window.electron.openExternal(sanitized.path);
            else void window.electron.openLocalPath(sanitized.path);
          },
        });
      }
      callback(links.length ? links : undefined);
    },
  });
}
