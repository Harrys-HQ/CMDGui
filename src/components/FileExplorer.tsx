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

  useEffect(() => {
    const loadRoot = async () => {
      const result = await window.electron.listDirectory(rootPath);
      setRootFiles(
        result.sort((a, b) => {
          if (a.isDirectory === b.isDirectory) return a.name.localeCompare(b.name);
          return a.isDirectory ? -1 : 1;
        })
      );
    };
    loadRoot();
  }, [rootPath]);

  const toggleFolder = useCallback(
    async (path: string) => {
      const newExpanded = new Set(expandedPaths);
      if (newExpanded.has(path)) {
        newExpanded.delete(path);
      } else {
        newExpanded.add(path);
        if (!childrenCache[path]) {
          const files = await window.electron.listDirectory(path);
          setChildrenCache((prev) => ({
            ...prev,
            [path]: files.sort((a, b) => {
              if (a.isDirectory === b.isDirectory) return a.name.localeCompare(b.name);
              return a.isDirectory ? -1 : 1;
            }),
          }));
        }
      }
      setExpandedPaths(newExpanded);
    },
    [expandedPaths, childrenCache]
  );

  const flattenedData = useMemo(() => {
    const data: FlatFileEntry[] = [];

    const recurse = (entries: FileEntry[], depth: number) => {
      entries.forEach((entry) => {
        const isOpen = expandedPaths.has(entry.path);
        data.push({ ...entry, depth, isOpen });
        if (entry.isDirectory && isOpen && childrenCache[entry.path]) {
          recurse(childrenCache[entry.path], depth + 1);
        }
      });
    };

    recurse(rootFiles, 0);
    return data;
  }, [rootFiles, expandedPaths, childrenCache]);

  const Row = ({ index, style }: { index: number; style: React.CSSProperties }) => {
    const entry = flattenedData[index];
    if (!entry) return null;

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
        onClick={() => entry.isDirectory && toggleFolder(entry.path)}
        onDoubleClick={() => entry.isDirectory && onSelectFolder(entry.path)}
        title={entry.path}
      >
        <span style={{ fontSize: '10px', width: '12px', opacity: entry.isDirectory ? 1 : 0 }}>
          {entry.isOpen ? '▼' : '▶'}
        </span>
        <span>{entry.isDirectory ? '📁' : '📄'}</span>
        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {entry.name}
        </span>
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
