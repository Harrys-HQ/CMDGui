const FILE_DROP_WINDOW_MS = 120;

function pathKey(path: string) {
  if (/^(?:[a-z]:[/\\]|\\\\)/i.test(path)) return path.replaceAll('/', '\\').toLowerCase();
  return path;
}

function localPath(value: string): string | null {
  const text = value.trim().replace(/^"(.*)"$/, '$1');
  if (/^file:\/\//i.test(text)) {
    try {
      const uri = new URL(text);
      const path = decodeURIComponent(uri.pathname);
      if (uri.hostname && uri.hostname !== 'localhost') return '\\\\' + uri.hostname + path;
      return /^\/[a-z]:\//i.test(path) ? path.slice(1) : path;
    } catch {
      return null;
    }
  }
  return /^(?:[a-z]:[/\\]|\\\\|\/(?!\/))/i.test(text) ? text : null;
}

function signature(paths: string[]) {
  return JSON.stringify([...new Set(paths.map(pathKey))].sort());
}

type DropData = Pick<DataTransfer, 'types' | 'files' | 'getData'>;

export function createTerminalDropHandler(paste: (text: string) => void) {
  // Some file drags expose a plain-text representation as well as a native
  // file event. Match across channels only, so intentional repeat drops work.
  const pending = new Map<ReturnType<typeof setTimeout>, string>();
  let native: { key: string; until: number } | undefined;

  return {
    file(paths: string[]) {
      const unique = [
        ...new Map(paths.filter(Boolean).map((path) => [pathKey(path), path])).values(),
      ];
      if (!unique.length) return;
      const key = signature(unique);
      const matching = [...pending].find(([, candidate]) => candidate === key);
      if (matching) {
        clearTimeout(matching[0]);
        pending.delete(matching[0]);
      } else {
        native = { key, until: Date.now() + FILE_DROP_WINDOW_MS };
      }
      paste(unique.map((path) => (path.includes(' ') ? '"' + path + '"' : path)).join(' ') + ' ');
    },

    text(data: DropData) {
      if (data.types.includes('Files') || data.files?.length) return;
      const text = data.getData('text/plain');
      if (!text) return;
      const lines = (data.getData('text/uri-list') || text)
        .split(/\r?\n/)
        .filter((line) => line.trim() && !line.startsWith('#'));
      const paths = lines.map(localPath);
      if (!paths.length || !paths.every((path) => path !== null)) {
        paste(text);
        return;
      }
      const key = signature(paths);
      if (native?.key === key && Date.now() <= native.until) {
        native = undefined;
        return;
      }
      const timer = setTimeout(() => {
        pending.delete(timer);
        paste(text);
      }, FILE_DROP_WINDOW_MS);
      pending.set(timer, key);
    },

    dispose() {
      pending.forEach((_, timer) => clearTimeout(timer));
      pending.clear();
      native = undefined;
    },
  };
}
