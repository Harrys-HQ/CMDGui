import React, { useState, useEffect, useCallback, useMemo } from 'react';
// @ts-ignore
import * as RW from 'react-window';
const List = (RW as any).FixedSizeList || (RW as any).List;
import { FileEntry } from '../types';

interface FileExplorerProps {
  rootPath: string;
  onSelectFolder: (path: string) => void;
}

interface FlatFileEntry extends FileEntry {
  depth: number;
  isOpen: boolean;
}

const ITEM_HEIGHT = 24;

const FileExplorer: React.FC<FileExplorerProps> = ({ rootPath, onSelectFolder }) => {
  const [expandedPaths, setExpandedPaths] = useState<Set<string>>(new Set());
  const [childrenCache, setChildrenCache] = useState<Record<string, FileEntry[]>>({});
  const [rootFiles, setRootFiles] = useState<FileEntry[]>([]);
  const [containerHeight, setContainerHeight] = useState(300);

  // Renaming/Creation State
  const [renamingPath, setRenamingPath] = useState<string | null>(null);
  const [editValue, setEditValue] = useState('');
  const [creatingInPath, setCreatingInPath] = useState<{
    path: string;
    type: 'file' | 'folder';
  } | null>(null);

  const loadFolder = useCallback(async (path: string) => {
    const result = await window.electron.listDirectory(path);
    const sorted = result.sort((a, b) => {
      if (a.isDirectory === b.isDirectory) return a.name.localeCompare(b.name);
      return a.isDirectory ? -1 : 1;
    });

    if (path === rootPath) {
      setRootFiles(sorted);
    } else {
      setChildrenCache((prev) => ({ ...prev, [path]: sorted }));
    }
  }, [rootPath]);

  useEffect(() => {
    loadFolder(rootPath);
  }, [rootPath, loadFolder]);

  useEffect(() => {
    if (!window.electron.onSidebarContextAction) return;

    const cleanup = window.electron.onSidebarContextAction(async (data) => {
      switch (data.action) {
        case 'explorer-open-terminal':
          if (data.path) onSelectFolder(data.path);
          break;

        case 'explorer-new-file':
          if (data.path) {
            setCreatingInPath({ path: data.path, type: 'file' });
            setEditValue('');
            if (!expandedPaths.has(data.path)) toggleFolder(data.path);
          }
          break;

        case 'explorer-new-folder':
          if (data.path) {
            setCreatingInPath({ path: data.path, type: 'folder' });
            setEditValue('');
            if (!expandedPaths.has(data.path)) toggleFolder(data.path);
          }
          break;

        case 'explorer-rename':
          if (data.path) {
            setRenamingPath(data.path);
            setEditValue(data.path.split(/[\\\/]/).pop() || '');
          }
          break;

        case 'explorer-delete':
          if (data.path) {
            const confirmed = window.confirm(`Move ${data.path} to trash?`);
            if (confirmed) {
              const res = await window.electron.fileDelete(data.path);
              if (res.success) {
                const parentPath = data.path.split(/[\\\/]/).slice(0, -1).join('\\');
                loadFolder(parentPath || rootPath);
              } else {
                alert(`Delete failed: ${res.error}`);
              }
            }
          }
          break;
      }
    });

    return cleanup;
  }, [onSelectFolder, expandedPaths, rootPath, loadFolder]);

  const toggleFolder = useCallback(
    async (path: string) => {
      const newExpanded = new Set(expandedPaths);
      if (newExpanded.has(path)) {
        newExpanded.delete(path);
      } else {
        newExpanded.add(path);
        if (!childrenCache[path]) {
          await loadFolder(path);
        }
      }
      setExpandedPaths(newExpanded);
    },
    [expandedPaths, childrenCache, loadFolder]
  );

  const handleRenameSubmit = async () => {
    if (!renamingPath || !editValue) return;
    const parentPath = renamingPath.split(/[\\\/]/).slice(0, -1).join('\\');
    const newPath = (parentPath ? parentPath + '\\' : '') + editValue;

    const res = await window.electron.fileRename(renamingPath, newPath);
    if (res.success) {
      setRenamingPath(null);
      loadFolder(parentPath || rootPath);
    } else {
      alert(`Rename failed: ${res.error}`);
    }
  };

  const handleCreateSubmit = async () => {
    if (!creatingInPath || !editValue) return;
    const newPath = creatingInPath.path + '\\' + editValue;

    let res;
    if (creatingInPath.type === 'file') {
      res = await window.electron.fileCreate(newPath);
    } else {
      res = await window.electron.fileMkdir(newPath);
    }

    if (res.success) {
      setCreatingInPath(null);
      loadFolder(creatingInPath.path);
    } else {
      alert(`Creation failed: ${res.error}`);
    }
  };

  const flattenedData = useMemo(() => {
    const data: FlatFileEntry[] = [];

    const recurse = (entries: FileEntry[], depth: number) => {
      entries.forEach((entry) => {
        const isOpen = expandedPaths.has(entry.path);
        data.push({ ...entry, depth, isOpen });
        
        // Check if we are creating a new item in this folder
        if (entry.isDirectory && isOpen && creatingInPath?.path === entry.path) {
          // Add a virtual "creating" entry
          data.push({
            name: '',
            path: '__creating__',
            isDirectory: creatingInPath.type === 'folder',
            depth: depth + 1,
            isOpen: false,
          });
        }

        if (entry.isDirectory && isOpen && childrenCache[entry.path]) {
          recurse(childrenCache[entry.path], depth + 1);
        }
      });
    };

    recurse(rootFiles, 0);
    return data;
  }, [rootFiles, expandedPaths, childrenCache, creatingInPath]);

  const handleContextMenu = (e: React.MouseEvent, entry: FileEntry) => {
    e.preventDefault();
    e.stopPropagation();
    window.electron.showContextMenu('file-explorer', {
      path: entry.path,
      isDirectory: entry.isDirectory,
    });
  };

  const Row = ({ index, style }: { index: number; style: React.CSSProperties }) => {
    const entry = flattenedData[index];
    if (!entry) return null;

    const isRenaming = renamingPath === entry.path;
    const isCreating = entry.path === '__creating__';

    return (
      <div
        style={{
          ...style,
          paddingLeft: `${entry.depth * 12 + 8}px`,
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          gap: '6px',
          fontSize: '12px',
          color: '#ccc',
          userSelect: 'none',
        }}
        className="file-explorer-item"
        onClick={() => !isRenaming && !isCreating && entry.isDirectory && toggleFolder(entry.path)}
        onDoubleClick={() =>
          !isRenaming && !isCreating && entry.isDirectory && onSelectFolder(entry.path)
        }
        onContextMenu={(e) => !isRenaming && !isCreating && handleContextMenu(e, entry)}
        title={entry.path}
      >
        <span style={{ fontSize: '10px', width: '12px', opacity: entry.isDirectory ? 1 : 0 }}>
          {entry.isOpen ? '▼' : '▶'}
        </span>
        <span>{entry.isDirectory ? '📁' : '📄'}</span>

        {isRenaming || isCreating ? (
          <input
            autoFocus
            className="rename-input"
            value={editValue}
            onChange={(e) => setEditValue(e.target.value)}
            onBlur={() => {
              setRenamingPath(null);
              setCreatingInPath(null);
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter') isRenaming ? handleRenameSubmit() : handleCreateSubmit();
              if (e.key === 'Escape') {
                setRenamingPath(null);
                setCreatingInPath(null);
              }
            }}
            onClick={(e) => e.stopPropagation()}
            style={{
              background: '#333',
              color: '#fff',
              border: '1px solid var(--accent-primary)',
              borderRadius: '2px',
              fontSize: '11px',
              padding: '0 2px',
              width: '100%',
              marginRight: '8px',
            }}
          />
        ) : (
          <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {entry.name}
          </span>
        )}
      </div>
    );
  };

  const containerRef = useCallback((node: HTMLDivElement | null) => {
    if (node !== null) {
      const updateHeight = () => setContainerHeight(node.offsetHeight);
      updateHeight();
      const observer = new ResizeObserver(updateHeight);
      observer.observe(node);
      return () => observer.disconnect();
    }
  }, []);

  return (
    <div
      ref={containerRef}
      style={{
        flex: 1,
        background: '#1e1e1e',
        borderTop: '1px solid #333',
        overflow: 'hidden',
        minHeight: '200px',
      }}
    >
      <List
        height={containerHeight}
        itemCount={flattenedData.length}
        itemSize={ITEM_HEIGHT}
        width="100%"
        children={Row as any}
      />
    </div>
  );
};

export default FileExplorer;
